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
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------------- Config ----------------
JWT_ALGORITHM = "HS256"
ACCESS_MINUTES = 60 * 8  # 8h shift
REFRESH_DAYS = 7

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="DHL Horas Extras API")
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
    centro_custo: str = ""
    setor: str = ""
    data: str  # YYYY-MM-DD
    hora_inicial: str  # HH:MM
    hora_final: str  # HH:MM
    total_horas: float = Field(gt=0, le=24)
    motivo: str = Field(min_length=3)
    observacoes: str = ""

class DecisionIn(BaseModel):
    observacoes_gerencia: str = ""

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

# ---------------- Overtime Requests ----------------
def _serialize_request(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc

@api.post("/requests")
async def create_request(body: RequestCreateIn, user: dict = Depends(require_role("gestor", "admin"))):
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
    return _serialize_request(doc)

@api.get("/requests/mine")
async def my_requests(user: dict = Depends(require_role("gestor", "admin"))):
    docs = await db.requests.find({"gestor_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api.get("/requests")
async def all_requests(status: Optional[str] = None,
                       _u: dict = Depends(require_role("gerencia", "admin"))):
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
    await db.requests.update_one({"id": req_id}, {"$set": update})
    doc.update(update)
    return _serialize_request(doc)

@api.post("/requests/{req_id}/approve")
async def approve(req_id: str, body: DecisionIn, user: dict = Depends(require_role("gerencia", "admin"))):
    return await _decide(req_id, "Aprovada", body.observacoes_gerencia, user)

@api.post("/requests/{req_id}/reject")
async def reject(req_id: str, body: DecisionIn, user: dict = Depends(require_role("gerencia", "admin"))):
    return await _decide(req_id, "Rejeitada", body.observacoes_gerencia, user)

# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"service": "DHL Horas Extras", "status": "ok"}

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

    await seed_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"],
                    "Administrador DHL", "admin", "TI", "ADM001")
    await seed_user(os.environ["DEMO_GESTOR_EMAIL"], os.environ["DEMO_GESTOR_PASSWORD"],
                    "Carlos Silva", "gestor", "Operações", "GST100")
    await seed_user(os.environ["DEMO_GERENTE_EMAIL"], os.environ["DEMO_GERENTE_PASSWORD"],
                    "Ana Ferreira", "gerencia", "Gerência Operacional", "GER200")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
