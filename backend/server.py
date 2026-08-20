from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from integrations.dhl_ponto import get_ponto_adapter
from integrations.storage import init_storage, put_object, get_object, APP_NAME as STORAGE_APP
from integrations.ai_classifier import classify_motivo
from integrations.push import public_key as vapid_public_key, send_push
from integrations import colaboradores_db as colab_db

from fastapi import UploadFile, File

# ---------------- Config ----------------
JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 60 * 8  # 8h shift
REFRESH_DAYS = 7

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="OtavioAppDHL — Horas Extras API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("dhl")

# ---------------- Utils ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def _secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=False,
                        samesite="lax", max_age=ACCESS_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=False,
                        samesite="lax", max_age=REFRESH_DAYS * 24 * 3600, path="/")

def clear_auth_cookies(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")

def user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "role": u["role"],
        "setor": u.get("setor", ""),
        "matricula": u.get("matricula", ""),
        "created_at": u.get("created_at"),
    }

# ---------------- Auth Dependency ----------------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Permissão negada")
        return user
    return dep

# ---------------- Models ----------------
Role = Literal["gestor", "gerencia", "admin"]
Status = Literal["Pendente", "Aprovada", "Rejeitada", "Cancelada"]

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserCreateIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    role: Role
    setor: str = ""
    matricula: str = ""

class RequestCreateIn(BaseModel):
    colaborador: str = Field(min_length=2)
    matricula: str = Field(min_length=1)
    turno: Literal["T1", "T2", "T3", "ADM"] = "ADM"
    setor: str = ""
    data: str  # YYYY-MM-DD
    hora_inicial: str  # HH:MM
    hora_final: str  # HH:MM
    total_horas: float = Field(gt=0, le=2, description="Máximo permitido: 2 horas por solicitação (CLT)")
    motivo: str = Field(min_length=3)
    observacoes: str = ""

class DecisionIn(BaseModel):
    observacoes_gerencia: str = ""

class SettingsIn(BaseModel):
    retention_policy: Literal["never", "auto", "manual"] = "never"

RETENTION_DAYS = 90

async def _get_settings() -> dict:
    doc = await db.settings.find_one({"id": "main"})
    if not doc:
        doc = {"id": "main", "retention_policy": "never", "last_cleanup": None}
        await db.settings.insert_one(doc)
    doc.pop("_id", None)
    return doc

async def _audit(user: dict, action: str, target_type: str, target_id: str = "", details: str = ""):
    await db.audit_log.insert_one({
        "id": str(uuid.uuid4()),
        "at": datetime.now(timezone.utc).isoformat(),
        "user_id": user["id"],
        "user_name": user["name"],
        "user_role": user["role"],
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
    })

async def _notify(user_id: str, type_: str, title: str, message: str, request_id: str = ""):
    """Create in-app notification for a user."""
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": type_,           # 'approved' | 'rejected' | 'cancelled' | 'new_request'
        "title": title,
        "message": message,
        "request_id": request_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

async def _run_cleanup() -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    res = await db.requests.delete_many({"created_at": {"$lt": cutoff}})
    await db.settings.update_one(
        {"id": "main"},
        {"$set": {"last_cleanup": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return res.deleted_count

# ---------------- Auth Endpoints ----------------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return user_public(user)

@api.post("/auth/logout")
async def logout(response: Response, _user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)

# ---------------- User Management ----------------
@api.post("/users")
async def create_user(body: UserCreateIn, _admin: dict = Depends(require_role("gerencia", "admin"))):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "setor": body.setor,
        "matricula": body.matricula,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    return user_public(doc)

@api.get("/users")
async def list_users(_admin: dict = Depends(require_role("gerencia", "admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_role("gerencia", "admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(404, "Usuário não encontrado")
    if target["id"] == current["id"]:
        raise HTTPException(400, "Você não pode remover a si mesmo")
    if target["role"] == "admin":
        raise HTTPException(400, "Não é permitido remover contas admin")
    await db.users.delete_one({"id": user_id})
    await _audit(current, "DELETE_USER", "user", user_id, f"{target['name']} ({target['email']})")
    return {"ok": True}

# ---------------- Overtime Requests ----------------
def _serialize_request(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@api.post("/requests")
async def create_request(body: RequestCreateIn, user: dict = Depends(require_role("gestor", "admin"))):
    if body.total_horas > 2:
        raise HTTPException(
            status_code=400,
            detail="Solicitações acima de 2 horas exigem aprovação direta do supervisor ou gerente. Entre em contato com ele.",
        )

    # Overlap validation
    existing = await db.requests.find({
        "matricula": body.matricula,
        "data": body.data,
        "status": {"$in": ["Pendente", "Aprovada"]},
    }).to_list(200)
    for r in existing:
        if body.hora_inicial < r["hora_final"] and body.hora_final > r["hora_inicial"]:
            raise HTTPException(
                status_code=400,
                detail=f"Já existe solicitação {r['status'].lower()} para esta matrícula neste horário ({r['hora_inicial']}–{r['hora_final']})",
            )

    doc = {
        "id": str(uuid.uuid4()),
        "numero": f"HE-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}",
        **body.model_dump(),
        "status": "Pendente",
        "gestor_id": user["id"],
        "gestor_nome": user["name"],
        "gerente_id": None,
        "gerente_nome": None,
        "observacoes_gerencia": "",
        "data_aprovacao": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.requests.insert_one(doc)
    await _audit(user, "CREATE_REQUEST", "request", doc["id"], f"{body.colaborador} · {body.data} · {body.total_horas}h")

    # Fire-and-forget AI classification of motivo
    try:
        categoria = await classify_motivo(body.motivo)
        await db.requests.update_one({"id": doc["id"]}, {"$set": {"categoria_ia": categoria}})
        doc["categoria_ia"] = categoria
    except Exception as e:
        logger.warning(f"AI classify failed: {e}")

    return _serialize_request(doc)
    return _serialize_request(doc)

@api.get("/requests/mine")
async def my_requests(user: dict = Depends(require_role("gestor", "admin"))):
    docs = await db.requests.find({"gestor_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api.get("/requests")
async def all_requests(status: Optional[str] = None,
                       _u: dict = Depends(require_role("gerencia", "admin"))):
    # Auto retention: if policy is "auto", purge records older than RETENTION_DAYS on read
    settings = await _get_settings()
    if settings.get("retention_policy") == "auto":
        await _run_cleanup()
    q = {}
    if status:
        q["status"] = status
    docs = await db.requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs

@api.get("/requests/stats")
async def stats(_u: dict = Depends(require_role("gerencia", "admin"))):
    now = datetime.now(timezone.utc)
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    pending = await db.requests.count_documents({"status": "Pendente"})
    approved_today = await db.requests.count_documents(
        {"status": "Aprovada", "data_aprovacao": {"$gte": start_day}}
    )
    rejected_today = await db.requests.count_documents(
        {"status": "Rejeitada", "data_aprovacao": {"$gte": start_day}}
    )
    total_month = await db.requests.count_documents({"created_at": {"$gte": start_month}})
    return {
        "pending": pending,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "total_month": total_month,
    }

@api.get("/requests/{req_id}")
async def get_request(req_id: str, user: dict = Depends(get_current_user)):
    doc = await db.requests.find_one({"id": req_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Solicitação não encontrada")
    if user["role"] == "gestor" and doc["gestor_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    return doc

async def _decide(req_id: str, status: str, observ: str, user: dict) -> dict:
    doc = await db.requests.find_one({"id": req_id})
    if not doc:
        raise HTTPException(404, "Solicitação não encontrada")
    if doc["status"] != "Pendente":
        raise HTTPException(400, "Solicitação já processada")
    update = {
        "status": status,
        "gerente_id": user["id"],
        "gerente_nome": user["name"],
        "observacoes_gerencia": observ,
        "data_aprovacao": datetime.now(timezone.utc).isoformat(),
    }

    # If approved, try to register in DHL Ponto system (best-effort)
    if status == "Aprovada":
        try:
            adapter = get_ponto_adapter()
            result = await adapter.registrar_hora_extra(
                matricula=doc.get("matricula", ""),
                data=doc.get("data", ""),
                hora_inicial=doc.get("hora_inicial", ""),
                hora_final=doc.get("hora_final", ""),
                total_horas=doc.get("total_horas", 0),
                motivo=doc.get("motivo", ""),
                aprovador_matricula=user.get("matricula", ""),
            )
            update["ponto_protocolo"] = result.protocolo
            update["ponto_sincronizado"] = result.sucesso
        except NotImplementedError:
            update["ponto_sincronizado"] = False
            update["ponto_protocolo"] = ""
        except Exception as e:
            logger.warning(f"Falha ao lançar no Ponto: {e}")
            update["ponto_sincronizado"] = False
            update["ponto_protocolo"] = ""

    await db.requests.update_one({"id": req_id}, {"$set": update})
    doc.update(update)
    await _audit(user, f"{status.upper()}_REQUEST", "request", req_id, f"{doc.get('colaborador')} · {doc.get('data')} · {doc.get('total_horas')}h")

    # Notify the gestor who created the request
    await _notify(
        user_id=doc["gestor_id"],
        type_=status.lower(),
        title=f"Solicitação {status.lower()}",
        message=f"Sua solicitação para {doc.get('colaborador', '')} ({doc.get('data', '')}) foi {status.lower()} por {user['name']}.",
        request_id=req_id,
    )
    return _serialize_request(doc)

@api.post("/requests/{req_id}/cancel")
async def cancel_request(req_id: str, user: dict = Depends(require_role("gestor", "admin"))):
    doc = await db.requests.find_one({"id": req_id})
    if not doc:
        raise HTTPException(404, "Solicitação não encontrada")
    if doc["gestor_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(403, "Você só pode cancelar suas próprias solicitações")
    if doc["status"] != "Pendente":
        raise HTTPException(400, "Somente solicitações pendentes podem ser canceladas")
    await db.requests.update_one({"id": req_id}, {"$set": {
        "status": "Cancelada",
        "data_aprovacao": datetime.now(timezone.utc).isoformat(),
    }})
    await _audit(user, "CANCEL_REQUEST", "request", req_id, doc.get("colaborador", ""))
    doc["status"] = "Cancelada"
    return _serialize_request(doc)

@api.post("/requests/{req_id}/approve")
async def approve(req_id: str, body: DecisionIn, user: dict = Depends(require_role("gerencia", "admin"))):
    return await _decide(req_id, "Aprovada", body.observacoes_gerencia, user)

@api.post("/requests/{req_id}/reject")
async def reject(req_id: str, body: DecisionIn, user: dict = Depends(require_role("gerencia", "admin"))):
    return await _decide(req_id, "Rejeitada", body.observacoes_gerencia, user)

# ---------------- Excel Export ----------------
@api.get("/reports/requests.xlsx")
async def export_requests(status: Optional[str] = None,
                          _u: dict = Depends(require_role("gerencia", "admin"))):
    q = {}
    if status and status != "all":
        q["status"] = status
    docs = await db.requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)

    wb = Workbook()
    ws = wb.active
    ws.title = "Horas Extras"

    headers = [
        "Número", "Colaborador", "Matrícula", "Turno", "Setor",
        "Data", "Hora Inicial", "Hora Final", "Total (h)",
        "Motivo", "Observações do Gestor",
        "Status", "Gestor", "Gerente",
        "Observações da Gerência", "Data da Decisão", "Criado em",
    ]
    ws.append(headers)

    header_fill = PatternFill("solid", fgColor="FFCC00")
    header_font = Font(bold=True, color="0F172A")
    for col_idx, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for d in docs:
        ws.append([
            d.get("numero", ""),
            d.get("colaborador", ""),
            d.get("matricula", ""),
            d.get("turno") or d.get("centro_custo", ""),
            d.get("setor", ""),
            d.get("data", ""),
            d.get("hora_inicial", ""),
            d.get("hora_final", ""),
            d.get("total_horas", 0),
            d.get("motivo", ""),
            d.get("observacoes", ""),
            d.get("status", ""),
            d.get("gestor_nome", ""),
            d.get("gerente_nome", "") or "",
            d.get("observacoes_gerencia", ""),
            d.get("data_aprovacao", "") or "",
            d.get("created_at", ""),
        ])

    widths = [22, 26, 12, 8, 18, 12, 12, 12, 10, 40, 30, 12, 22, 22, 30, 22, 22]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    ws.freeze_panes = "A2"

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    filename = f"horas_extras_{ts}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ---------------- Settings & Cleanup ----------------
@api.get("/settings")
async def get_settings(_u: dict = Depends(require_role("gestor", "gerencia", "admin"))):
    return await _get_settings()

@api.put("/settings")
async def update_settings(body: SettingsIn, user: dict = Depends(require_role("gestor", "gerencia", "admin"))):
    await db.settings.update_one(
        {"id": "main"},
        {"$set": {"retention_policy": body.retention_policy}},
        upsert=True,
    )
    await _audit(user, "UPDATE_SETTINGS", "settings", "main", f"retention_policy={body.retention_policy}")
    return await _get_settings()

@api.get("/requests/cleanup/preview")
async def cleanup_preview(_u: dict = Depends(require_role("gestor", "gerencia", "admin"))):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    count = await db.requests.count_documents({"created_at": {"$lt": cutoff}})
    return {"eligible": count, "cutoff": cutoff, "retention_days": RETENTION_DAYS}

@api.post("/requests/cleanup")
async def cleanup_now(user: dict = Depends(require_role("gestor", "gerencia", "admin"))):
    deleted = await _run_cleanup()
    await _audit(user, "CLEANUP_OLD", "requests", "", f"deleted={deleted}")
    return {"deleted": deleted}

@api.post("/requests/cleanup/all")
async def cleanup_all(user: dict = Depends(require_role("gestor", "gerencia", "admin"))):
    res = await db.requests.delete_many({})
    await db.settings.update_one(
        {"id": "main"},
        {"$set": {"last_cleanup": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    await _audit(user, "PURGE_ALL", "requests", "", f"deleted={res.deleted_count}")
    return {"deleted": res.deleted_count}

@api.get("/audit-log")
async def get_audit_log(_u: dict = Depends(require_role("gerencia", "admin"))):
    docs = await db.audit_log.find({}, {"_id": 0}).sort("at", -1).to_list(500)
    return docs

# ---------------- Notifications ----------------
@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    unread = sum(1 for n in docs if not n.get("read"))
    return {"items": docs, "unread": unread}

@api.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]},
        {"$set": {"read": True}},
    )
    return {"ok": True}

@api.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    res = await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}},
    )
    return {"updated": res.modified_count}

# ---------------- Push Notifications (VAPID) ----------------
class PushSubIn(BaseModel):
    subscription: dict

@api.get("/push/vapid-public")
async def push_vapid(_u: dict = Depends(get_current_user)):
    return {"public_key": vapid_public_key()}

@api.post("/push/subscribe")
async def push_subscribe(body: PushSubIn, user: dict = Depends(get_current_user)):
    endpoint = body.subscription.get("endpoint", "")
    if not endpoint:
        raise HTTPException(400, "Invalid subscription")
    await db.push_subscriptions.update_one(
        {"endpoint": endpoint},
        {"$set": {
            "endpoint": endpoint,
            "user_id": user["id"],
            "subscription": body.subscription,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}

@api.post("/push/unsubscribe")
async def push_unsubscribe(body: PushSubIn, user: dict = Depends(get_current_user)):
    await db.push_subscriptions.delete_many({
        "endpoint": body.subscription.get("endpoint", ""),
        "user_id": user["id"],
    })
    return {"ok": True}

# ---------------- Attachments (Object Storage) ----------------
MAX_ATTACHMENT_MB = 10

@api.post("/requests/{req_id}/attachments")
async def upload_attachment(req_id: str, file: UploadFile = File(...),
                            user: dict = Depends(get_current_user)):
    req = await db.requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(404, "Solicitação não encontrada")
    if user["role"] == "gestor" and req["gestor_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão para esta solicitação")

    data = await file.read()
    if len(data) > MAX_ATTACHMENT_MB * 1024 * 1024:
        raise HTTPException(400, f"Arquivo maior que {MAX_ATTACHMENT_MB}MB")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    if ext not in {"pdf", "png", "jpg", "jpeg", "webp"}:
        raise HTTPException(400, "Formato não permitido (pdf, png, jpg, jpeg, webp)")

    att_id = str(uuid.uuid4())
    path = f"{STORAGE_APP}/attachments/{req_id}/{att_id}.{ext}"
    try:
        result = put_object(path, data, file.content_type or "application/octet-stream")
    except Exception as e:
        raise HTTPException(500, f"Erro ao salvar anexo: {e}")

    doc = {
        "id": att_id,
        "request_id": req_id,
        "storage_path": result["path"],
        "original_filename": file.filename or f"anexo.{ext}",
        "content_type": file.content_type or "application/octet-stream",
        "size": result.get("size", len(data)),
        "uploaded_by": user["id"],
        "uploaded_by_name": user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.attachments.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/requests/{req_id}/attachments")
async def list_attachments(req_id: str, user: dict = Depends(get_current_user)):
    req = await db.requests.find_one({"id": req_id})
    if not req:
        raise HTTPException(404, "Solicitação não encontrada")
    if user["role"] == "gestor" and req["gestor_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    docs = await db.attachments.find({"request_id": req_id}, {"_id": 0}).to_list(50)
    return docs

@api.get("/attachments/{att_id}/download")
async def download_attachment(att_id: str, user: dict = Depends(get_current_user)):
    att = await db.attachments.find_one({"id": att_id})
    if not att:
        raise HTTPException(404, "Anexo não encontrado")
    req = await db.requests.find_one({"id": att["request_id"]})
    if not req:
        raise HTTPException(404, "Solicitação não encontrada")
    if user["role"] == "gestor" and req["gestor_id"] != user["id"]:
        raise HTTPException(403, "Sem permissão")
    try:
        data, ct = get_object(att["storage_path"])
    except Exception as e:
        raise HTTPException(500, f"Erro ao baixar anexo: {e}")
    return Response(
        content=data,
        media_type=att.get("content_type", ct),
        headers={"Content-Disposition": f'inline; filename="{att["original_filename"]}"'},
    )

# ---------------- Bulk Approve/Reject ----------------
class BulkDecisionIn(BaseModel):
    request_ids: list[str]
    observacoes_gerencia: str = ""

@api.post("/requests/bulk-approve")
async def bulk_approve(body: BulkDecisionIn, user: dict = Depends(require_role("gerencia", "admin"))):
    results = {"approved": [], "failed": []}
    for rid in body.request_ids:
        try:
            await _decide(rid, "Aprovada", body.observacoes_gerencia, user)
            results["approved"].append(rid)
        except HTTPException as e:
            results["failed"].append({"id": rid, "error": e.detail})
    return results

@api.post("/requests/bulk-reject")
async def bulk_reject(body: BulkDecisionIn, user: dict = Depends(require_role("gerencia", "admin"))):
    results = {"rejected": [], "failed": []}
    for rid in body.request_ids:
        try:
            await _decide(rid, "Rejeitada", body.observacoes_gerencia, user)
            results["rejected"].append(rid)
        except HTTPException as e:
            results["failed"].append({"id": rid, "error": e.detail})
    return results

# ---------------- Monthly PDF Report ----------------
@api.get("/reports/monthly.pdf")
async def monthly_pdf(month: Optional[str] = None,
                      _u: dict = Depends(require_role("gerencia", "admin"))):
    """Generate a PDF summary. month format: YYYY-MM (default: current)."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors as rl_colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    now = datetime.now(timezone.utc)
    if not month:
        month = now.strftime("%Y-%m")
    start = f"{month}-01T00:00:00"
    # end = first day of next month
    y, m = month.split("-")
    y, m = int(y), int(m)
    if m == 12:
        next_month = f"{y+1}-01-01T00:00:00"
    else:
        next_month = f"{y}-{m+1:02d}-01T00:00:00"

    docs = await db.requests.find({
        "created_at": {"$gte": start, "$lt": next_month}
    }, {"_id": 0}).sort("created_at", -1).to_list(2000)

    # Stats
    stats = {"total": len(docs), "aprovadas": 0, "rejeitadas": 0, "pendentes": 0, "canceladas": 0}
    horas_por_turno = {"T1": 0, "T2": 0, "T3": 0, "ADM": 0}
    top_colab = {}
    for d in docs:
        status_key = {"Aprovada": "aprovadas", "Rejeitada": "rejeitadas", "Pendente": "pendentes", "Cancelada": "canceladas"}.get(d.get("status"), None)
        if status_key:
            stats[status_key] += 1
        if d.get("status") == "Aprovada":
            t = d.get("turno") or "ADM"
            if t in horas_por_turno:
                horas_por_turno[t] += float(d.get("total_horas", 0) or 0)
            col = d.get("colaborador", "—")
            top_colab[col] = top_colab.get(col, 0) + float(d.get("total_horas", 0) or 0)

    total_horas = sum(horas_por_turno.values())
    top_list = sorted(top_colab.items(), key=lambda x: -x[1])[:10]

    # Build PDF
    buf = BytesIO()
    pdf = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5*cm, leftMargin=1.5*cm,
                            rightMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    yellow = rl_colors.HexColor("#FFCC00")
    red = rl_colors.HexColor("#D40511")
    dark = rl_colors.HexColor("#0F172A")
    story = []

    # Header
    title_style = ParagraphStyle("t", parent=styles["Title"], fontName="Helvetica-Bold",
                                  textColor=red, fontSize=20, spaceAfter=4)
    story.append(Paragraph("DHL — Relatório de Horas Extras", title_style))
    story.append(Paragraph(f"<b>Período:</b> {month}", styles["Normal"]))
    story.append(Paragraph(f"<b>Gerado em:</b> {now.strftime('%d/%m/%Y %H:%M UTC')}", styles["Normal"]))
    story.append(Spacer(1, 0.4*cm))

    # Summary table
    summary_data = [
        ["Total de solicitações", stats["total"]],
        ["Aprovadas",             stats["aprovadas"]],
        ["Rejeitadas",            stats["rejeitadas"]],
        ["Pendentes",             stats["pendentes"]],
        ["Canceladas",            stats["canceladas"]],
        ["Horas extras aprovadas (total)", f"{total_horas:.2f} h"],
    ]
    tbl = Table(summary_data, colWidths=[9*cm, 6*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), yellow),
        ("TEXTCOLOR", (0, 0), (-1, 0), dark),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#CBD5E1")),
        ("BOX", (0, 0), (-1, -1), 1, rl_colors.HexColor("#0F172A")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rl_colors.white, rl_colors.HexColor("#F8FAFC")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 0.6*cm))

    story.append(Paragraph("<b>Horas aprovadas por turno</b>", styles["Heading3"]))
    turno_data = [["Turno", "Horas"]] + [[k, f"{v:.2f}"] for k, v in horas_por_turno.items()]
    turno_tbl = Table(turno_data, colWidths=[7*cm, 5*cm])
    turno_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), yellow),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#CBD5E1")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(turno_tbl)
    story.append(Spacer(1, 0.6*cm))

    if top_list:
        story.append(Paragraph("<b>Top colaboradores (horas aprovadas)</b>", styles["Heading3"]))
        top_data = [["Colaborador", "Horas"]] + [[k, f"{v:.2f}"] for k, v in top_list]
        top_tbl = Table(top_data, colWidths=[10*cm, 5*cm])
        top_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), yellow),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#CBD5E1")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(top_tbl)

    pdf.build(story)
    buf.seek(0)
    filename = f"relatorio_{month}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ---------------- DHL Ponto Integration (SKELETON) ----------------
@api.get("/integrations/ponto/status")
async def ponto_status(_u: dict = Depends(get_current_user)):
    """Verifica se a integração com o Ponto DHL está ativa."""
    adapter = get_ponto_adapter()
    return await adapter.status()

@api.get("/integrations/ponto/colaborador/{matricula}")
async def ponto_colaborador(matricula: str, _u: dict = Depends(get_current_user)):
    """Busca dados do colaborador. 1) Excel DHL local  2) Adapter Ponto (mock/real)."""
    # Prefer local Excel DB
    rec = colab_db.find_by_matricula(matricula)
    if rec:
        return {
            "matricula": rec["matricula"],
            "nome": rec["nome"],
            "setor": rec["setor"],
            "centro_custo": "",
            "turno": rec["turno"],
            "gestor_matricula": "",
            "ativo": True,
            "turma": rec["turma"],
            "turma_hora_inicial": rec["turma_hora_inicial"],
            "turma_hora_final": rec["turma_hora_final"],
        }
    adapter = get_ponto_adapter()
    col = await adapter.buscar_colaborador(matricula)
    if not col:
        raise HTTPException(404, "Colaborador não encontrado")
    return col.to_dict()

@api.get("/colaboradores/search")
async def colaboradores_search(q: str, _u: dict = Depends(get_current_user)):
    """Busca fuzzy por nome ou matrícula. Retorna até 10 resultados."""
    return colab_db.search(q)

@api.post("/colaboradores/reload")
async def colaboradores_reload(user: dict = Depends(require_role("gerencia", "admin"))):
    """Recarrega o Excel /app/backend/data/colaboradores.xlsx após atualização."""
    n = colab_db.load_from_excel()
    await _audit(user, "RELOAD_COLABORADORES", "colaboradores", "", f"total={n}")
    return {"loaded": n}

# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"service": "OtavioAppDHL — Horas Extras", "status": "ok"}

# ---------------- Register router + CORS ----------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Startup: indexes + seed ----------------
async def seed_user(email: str, password: str, name: str, role: str, setor: str = "", matricula: str = ""):
    email = email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "role": role,
            "setor": setor,
            "matricula": matricula,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded user: {email} ({role})")
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"email": email},
            {"$set": {"password_hash": hash_password(password), "role": role, "name": name}}
        )
        logger.info(f"Updated seed password for: {email}")

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.requests.create_index("gestor_id")
    await db.requests.create_index("status")
    await db.requests.create_index("created_at")
    await db.attachments.create_index("request_id")

    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init at startup: {e}")

    try:
        colab_db.load_from_excel()
    except Exception as e:
        logger.warning(f"Colaboradores DB load failed: {e}")

    await seed_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"],
                    "Administrador DHL", "admin", "TI", "ADM001")
    await seed_user(os.environ["DEMO_GESTOR_EMAIL"], os.environ["DEMO_GESTOR_PASSWORD"],
                    "Carlos Silva", "gestor", "Operações", "GST100")
    await seed_user(os.environ["DEMO_GERENTE_EMAIL"], os.environ["DEMO_GERENTE_PASSWORD"],
                    "Ana Ferreira", "gerencia", "Gerência Operacional", "GER200")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
