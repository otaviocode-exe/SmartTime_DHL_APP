"""
Integração Ponto ADP — OtavioAppDHL.

MODO ATUAL: MOCK (simulado). Quando a DHL/ADP fornecer a API real,
implemente RealADPAdapter e troque via env ADP_PONTO_MODE=real.

Uso: detectar se o colaborador JÁ ESTÁ em hora extra no momento da solicitação.
"""
from __future__ import annotations
import os
import hashlib
from datetime import datetime, timezone


class MockADPAdapter:
    """Mock determinístico: ~1 em cada 7 matrículas aparece 'em hora extra'."""

    async def status_hora_extra(self, matricula: str) -> dict:
        mat = str(matricula).strip()
        h = int(hashlib.md5(mat.encode()).hexdigest(), 16)
        em_he = (h % 7) == 0
        agora = datetime.now(timezone.utc)
        return {
            "matricula": mat,
            "em_hora_extra": em_he,
            "desde": agora.replace(minute=0, second=0, microsecond=0).isoformat() if em_he else None,
            "horas_extras_hoje": round((h % 90) / 60, 2) if em_he else 0,
            "fonte": "ADP (SIMULADO)",
            "mock": True,
        }

    async def status(self) -> dict:
        return {"ativo": True, "modo": "mock", "descricao": "Ponto ADP simulado — aguardando API real"}


def get_adp_adapter():
    mode = os.environ.get("ADP_PONTO_MODE", "mock")
    return MockADPAdapter()
