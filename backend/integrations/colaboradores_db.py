"""
Colaboradores DB — lê o Excel /app/backend/data/colaboradores.xlsx.

PARA ATUALIZAR A LISTA DE COLABORADORES:
  1. Coloque o novo arquivo Excel em: /app/backend/data/colaboradores.xlsx
  2. Chame o endpoint POST /api/colaboradores/reload  (auth: gerência/admin)
     — OU simplesmente reinicie o backend (`sudo supervisorctl restart backend`).

O arquivo "Head DHL e Agências" possui DUAS abas:

  Aba "DHL" (Head)  -> Área I2M
    - "Matrícula"            (nº)
    - "Nome"  (1ª ocorrência = nome do colaborador)
    - "Nome"  (2ª ocorrência = SETOR/estabelecimento, ex.: "UNILEVER VINHEDO - EXPEDICAO")
    - "Turma - Descrição"    (texto informativo da escala, ex.: "22:00 - 06:10 (6x2) VINHEDO - B")
    - "Horário"              (entrada/intervalo/saída, ex.: "22:00 01:00 02:00 06:10")

  Aba "EXPERT" (Agências) -> Área PKCG
    - "Matrícula", "Nome", "Função", "Turno" (ex.: "22:00 - 06:00")

Escala usada no cálculo de HE: 1º horário = ENTRADA, último horário = SAÍDA (coluna "Horário").
O TURNO (T1/T2/T3/ADM) é DEDUZIDO pela hora de entrada.
"""
from __future__ import annotations
import re
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger("dhl.colab")

DATA_FILE = Path(__file__).parent.parent / "data" / "colaboradores.xlsx"

_cache: list[dict] = []
_by_mat: dict[str, dict] = {}
_by_name: dict[str, dict] = {}

_TIME_RE = re.compile(r"(\d{1,2}:\d{2})")


def _infer_turno_from_entrada(entrada: str) -> str:
    m = re.match(r"\s*(\d{1,2}):(\d{2})", entrada or "")
    if not m:
        return "ADM"
    h = int(m.group(1))
    if 5 <= h < 12:   return "T3"    # manhã (ex.: 06:00)
    if 12 <= h < 17:  return "T1"    # tarde (ex.: 13:40)
    if 17 <= h < 21:  return "ADM"   # comercial
    return "T2"                      # noite (>= 21 ou madrugada)


def _entrada_saida(horario: str) -> tuple[str, str]:
    """Extrai (entrada, saída) da coluna Horário: 1º horário e último horário."""
    times = _TIME_RE.findall(horario or "")
    if not times:
        return "", ""
    return times[0], times[-1]


def area_from_setor(setor: str) -> str:
    """Fallback de área quando o colaborador não está na base."""
    return "PKCG" if "SONIC" in (setor or "").upper() else "I2M"


def area_from_matricula(mat: str) -> Optional[str]:
    rec = _by_mat.get(str(mat).strip())
    return rec["area"] if rec else None


def _mat_str(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    try:
        return str(int(v))
    except (ValueError, TypeError):
        return str(v).strip()


def _clean(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    return str(v).strip()


def _build_record(matricula: str, nome: str, setor: str, turma: str,
                  horario: str, area: str) -> dict:
    hi, hf = _entrada_saida(horario or turma)
    return {
        "matricula": matricula,
        "nome": nome,
        "setor": setor,
        "area": area,
        "turma": turma,                 # "Turma - Descrição" (informativo)
        "turno": _infer_turno_from_entrada(hi),
        "turma_hora_inicial": hi,       # ENTRADA da escala
        "turma_hora_final": hf,         # SAÍDA da escala
    }


def _load_dhl(path: Path) -> list[dict]:
    raw = pd.read_excel(path, sheet_name="DHL", header=None)
    hdr = [str(x).strip() for x in raw.iloc[0].tolist()]

    def idx(name: str, occ: int = 0):
        found = [i for i, h in enumerate(hdr) if h.lower() == name.lower()]
        return found[occ] if len(found) > occ else None

    i_mat = idx("Matrícula")
    i_nome = idx("Nome", 0)
    i_setor = idx("Nome", 1)            # 2ª coluna "Nome" = setor/estabelecimento
    i_turma = idx("Turma - Descrição")
    i_hor = idx("Horário")

    recs = []
    for _, row in raw.iloc[1:].iterrows():
        mat = _mat_str(row[i_mat]) if i_mat is not None else ""
        nome = _clean(row[i_nome]) if i_nome is not None else ""
        if not mat and not nome:
            continue
        setor = _clean(row[i_setor]) if i_setor is not None else ""
        turma = _clean(row[i_turma]) if i_turma is not None else ""
        horario = _clean(row[i_hor]) if i_hor is not None else ""
        recs.append(_build_record(mat, nome, setor, turma, horario, area="I2M"))
    return recs


def _load_expert(path: Path) -> list[dict]:
    try:
        raw = pd.read_excel(path, sheet_name="EXPERT", header=None)
    except (ValueError, KeyError):
        return []
    hdr = [str(x).strip() for x in raw.iloc[0].tolist()]

    def idx(name: str):
        for i, h in enumerate(hdr):
            if h.lower() == name.lower():
                return i
        return None

    i_mat = idx("Matrícula")
    i_nome = idx("Nome")
    i_func = idx("Função")
    i_turno = idx("Turno")

    recs = []
    for _, row in raw.iloc[1:].iterrows():
        mat = _mat_str(row[i_mat]) if i_mat is not None else ""
        nome = _clean(row[i_nome]) if i_nome is not None else ""
        if not mat and not nome:
            continue
        func = _clean(row[i_func]) if i_func is not None else ""
        turno_txt = _clean(row[i_turno]) if i_turno is not None else ""
        setor = f"AGÊNCIAS · {func}".strip(" ·") if func else "AGÊNCIAS"
        # Para EXPERT, "Turno" já é "HH:MM - HH:MM" (entrada - saída).
        recs.append(_build_record(mat, nome, setor, turno_txt, turno_txt, area="PKCG"))
    return recs


def load_from_excel(path: Path | str | None = None) -> int:
    global _cache, _by_mat, _by_name
    path = Path(path) if path else DATA_FILE
    if not path.exists():
        logger.warning(f"Colaboradores DB não encontrado em {path}")
        _cache, _by_mat, _by_name = [], {}, {}
        return 0

    recs: list[dict] = []
    try:
        recs.extend(_load_dhl(path))
    except Exception as e:
        logger.warning(f"Falha ao ler aba DHL: {e}")
    try:
        recs.extend(_load_expert(path))
    except Exception as e:
        logger.warning(f"Falha ao ler aba EXPERT: {e}")

    _cache = recs
    _by_mat = {r["matricula"]: r for r in recs if r["matricula"]}
    _by_name = {r["nome"].upper(): r for r in recs if r["nome"]}
    logger.info(f"Colaboradores carregados: {len(recs)} (I2M/DHL + PKCG/EXPERT)")
    return len(recs)


def find_by_matricula(mat: str) -> Optional[dict]:
    return _by_mat.get(str(mat).strip())


def find_by_name(name: str) -> Optional[dict]:
    return _by_name.get((name or "").strip().upper())


def search(q: str, limit: int = 10, area: str | None = None) -> list[dict]:
    """Busca fuzzy por trecho do nome ou matrícula (case-insensitive)."""
    q = (q or "").strip().upper()
    if not q or len(q) < 2:
        return []
    out = []
    for r in _cache:
        if area and r["area"] != area:
            continue
        if q in r["matricula"] or q in r["nome"].upper():
            out.append(r)
            if len(out) >= limit:
                break
    return out


def list_by(area: str | None = None, turno: str | None = None, setor: str | None = None) -> list[dict]:
    out = []
    for r in _cache:
        if area and r["area"] != area:
            continue
        if turno and r["turno"] != turno:
            continue
        if setor and r["setor"] != setor:
            continue
        out.append(r)
    return sorted(out, key=lambda x: x["nome"])


def all_setores(area: str | None = None) -> list[str]:
    return sorted({r["setor"] for r in _cache if r["setor"] and (not area or r["area"] == area)})


def all_records() -> list[dict]:
    return list(_cache)
