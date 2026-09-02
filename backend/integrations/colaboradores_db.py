"""
Colaboradores DB — lê o Excel /app/backend/data/colaboradores.xlsx.

PARA ATUALIZAR A LISTA DE COLABORADORES:
  1. Coloque o novo arquivo Excel em: /app/backend/data/colaboradores.xlsx
  2. Chame o endpoint POST /api/colaboradores/reload  (auth: gerência/admin)
     — OU simplesmente reinicie o backend (`sudo supervisorctl restart backend`).

O arquivo deve ter as colunas (nomes exatos, com espaços):
  - "Matrícula"
  - "Nome"                       (nome do colaborador)
  - "Nome"                       (2ª coluna Nome = SETOR, ex.: "UNILEVER VINHEDO - EXPEDICAO")
  - "Turma - Descrição"          (horário/turno, ex.: "22:00 - 06:10 SEG. a SAB.")

O TURNO (T1/T2/T3/ADM) é DEDUZIDO da coluna "Turma - Descrição" pela hora inicial.
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


def _infer_turno(turma: str) -> str:
    m = re.match(r"\s*(\d{1,2}):(\d{2})", turma or "")
    if not m:
        return "ADM"
    h = int(m.group(1))
    if 5 <= h < 12:   return "T3"    # manhã (ex.: 06:00)
    if 12 <= h < 17:  return "T1"    # tarde (ex.: 13:50)
    if 17 <= h < 21:  return "ADM"   # comercial
    return "T2"                      # noite (>= 21 ou madrugada)


def _turno_horario(turma: str) -> tuple[str, str]:
    m = re.match(r"\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", turma or "")
    if not m:
        return "", ""
    return m.group(1), m.group(2)


def _normalize(rec: dict) -> dict:
    mat = str(int(rec.get("Matrícula", 0))) if rec.get("Matrícula") else ""
    # The Excel has TWO columns literally named "Nome" — pandas suffixes them.
    # After lstrip/normalization pandas keeps distinct keys via trailing spaces.
    # We normalize by iterating original columns externally (see load_from_excel).
    nome = rec.get("_nome", "").strip()
    setor = rec.get("_setor", "").strip()
    turma = rec.get("_turma", "").strip()
    turno = _infer_turno(turma)
    hi, hf = _turno_horario(turma)
    return {
        "matricula": mat,
        "nome": nome,
        "setor": setor,
        "area": area_from_setor(setor),
        "turma": turma,
        "turno": turno,
        "turma_hora_inicial": hi,
        "turma_hora_final": hf,
    }


def area_from_setor(setor: str) -> str:
    return "PKCG" if "SONIC" in (setor or "").upper() else "I2M"


def load_from_excel(path: Path | str | None = None) -> int:
    global _cache, _by_mat, _by_name
    path = Path(path) if path else DATA_FILE
    if not path.exists():
        logger.warning(f"Colaboradores DB não encontrado em {path}")
        _cache, _by_mat, _by_name = [], {}, {}
        return 0

    df = pd.read_excel(path)
    # Rename columns robustly (Excel has trailing spaces + duplicate "Nome")
    cols = list(df.columns)
    # First occurrence of "Nome" = colaborador; second = setor
    nome_idx = [i for i, c in enumerate(cols) if str(c).strip().lower() == "nome"]
    df = df.rename(columns={
        cols[0]: "Matrícula",
        cols[nome_idx[0]]: "_nome",
        cols[nome_idx[1]]: "_setor" if len(nome_idx) > 1 else "_nome_2",
        cols[-1]: "_turma",
    })

    recs = []
    for _, row in df.iterrows():
        try:
            rec = _normalize(row.to_dict())
        except Exception:
            continue
        if not rec["matricula"] and not rec["nome"]:
            continue
        recs.append(rec)

    _cache = recs
    _by_mat = {r["matricula"]: r for r in recs if r["matricula"]}
    _by_name = {r["nome"].upper(): r for r in recs if r["nome"]}
    logger.info(f"Colaboradores carregados: {len(recs)}")
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
