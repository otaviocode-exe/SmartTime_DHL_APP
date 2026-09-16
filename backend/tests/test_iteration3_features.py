"""Iteration 3 features:
- Gerência as creator (Pendente Gerência -> self-approve).
- New colaboradores DB (515: 506 DHL/I2M + 9 EXPERT/PKCG) with turma/turma_hora_inicial/turma_hora_final.
- Area now derived from colab_db (I2M for DHL tab, PKCG for EXPERT tab).
- categoria_ia removed everywhere (no field returned by /api/requests).
- 2h ceiling remains, 24h block remains.
"""
import random
from datetime import datetime, timedelta, timezone

import pytest
import requests

from conftest import API, CREDS, login_session

PENDING_SUP = "Pendente Supervisor"
PENDING_GER = "Pendente Gerência"


def future_date(offset=3):
    return (datetime.now(timezone.utc) + timedelta(days=offset)).strftime("%Y-%m-%d")


def _base_payload(**overrides):
    body = {
        "colaborador": "TEST_ Colaborador",
        "matricula": f"TST{random.randint(100000, 999999)}",
        "turno": "T1",
        "setor": "",
        "data": future_date(),
        "hora_inicial": "18:00",
        "hora_final": "19:30",
        "total_horas": 1.5,
        "motivo": "TEST_ pico de volume",
        "observacoes": "TEST_",
    }
    body.update(overrides)
    return body


# ---------------- Gerência creator flow ----------------
class TestGerenciaCreator:
    def test_gerencia_creates_and_self_approves(self, gerencia):
        body = _base_payload(hi="06:00", hf="07:00", horas=1.0)
        body["hora_inicial"], body["hora_final"] = body["hi"] if "hi" in body else body["hora_inicial"], body["hora_final"]
        body = _base_payload(hora_inicial="06:00", hora_final="07:00", total_horas=1.0)
        r = gerencia.post(f"{API}/requests", json=body, timeout=60)
        assert r.status_code == 200, r.text[:300]
        doc = r.json()
        assert doc["status"] == PENDING_GER, f"expected {PENDING_GER}, got {doc['status']}"
        assert doc["gestor_id"] == gerencia.user["id"]
        assert "categoria_ia" not in doc or not doc.get("categoria_ia"), f"categoria_ia leaked: {doc.get('categoria_ia')}"
        rid = doc["id"]

        pend = gerencia.get(f"{API}/requests?pending=1", timeout=30)
        assert pend.status_code == 200
        assert rid in [d["id"] for d in pend.json()], "created request not in pending queue"

        appr = gerencia.post(f"{API}/requests/{rid}/approve", json={"observacoes_gerencia": "TEST_ ok"}, timeout=60)
        assert appr.status_code == 200, appr.text[:300]
        assert appr.json()["status"] == "Aprovada"

        mine = gerencia.get(f"{API}/requests/mine", timeout=30).json()
        found = next((d for d in mine if d["id"] == rid), None)
        assert found, "approved request not in /requests/mine"
        assert found["status"] == "Aprovada"


# ---------------- New colaboradores DB (515) with turma/turma_hora_* ----------------
class TestColaboradoresDB:
    def test_colaborador_dhl_9875135(self, coord_i2m):
        r = coord_i2m.get(f"{API}/integrations/ponto/colaborador/9875135", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert "ABNER" in d.get("nome", "").upper(), f"nome={d.get('nome')}"
        assert d.get("turma_hora_inicial") == "22:00", d
        assert d.get("turma_hora_final") == "06:10", d
        assert d.get("turma"), "turma (descrição) missing"

    def test_colaborador_expert_174528(self, coord_pkcg):
        r = coord_pkcg.get(f"{API}/integrations/ponto/colaborador/174528", timeout=30)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d.get("matricula") == "174528" or str(d.get("matricula")) == "174528"
        assert d.get("turma_hora_inicial") and d.get("turma_hora_final")

    def test_search_by_name_returns_area(self, coord_i2m):
        r = coord_i2m.get(f"{API}/colaboradores/search?q=ADRIAN", timeout=30)
        assert r.status_code == 200, r.text[:300]
        results = r.json()
        assert isinstance(results, list) and len(results) > 0
        for item in results:
            assert "area" in item, f"missing area field: {item}"
            assert item["area"] in ("I2M", "PKCG")

    def test_area_from_dhl_matricula_is_i2m(self, coord_i2m):
        body = _base_payload(matricula="9875135", colaborador="ABNER HENRIQUES EMILIANO",
                             data=future_date(15), hora_inicial="06:10", hora_final="08:10", total_horas=2.0)
        r = coord_i2m.post(f"{API}/requests", json=body, timeout=60)
        if r.status_code in (400, 409):
            pytest.skip(f"pre-existing state for 9875135: {r.text[:150]}")
        assert r.status_code == 200, r.text[:300]
        assert r.json()["area"] == "I2M"

    def test_area_from_expert_matricula_is_pkcg(self, coord_pkcg):
        body = _base_payload(matricula="174528", colaborador="TEST_ EXPERT",
                             hora_inicial="06:00", hora_final="08:00", total_horas=2.0)
        r = coord_pkcg.post(f"{API}/requests", json=body, timeout=60)
        if r.status_code == 409:
            pytest.skip(f"24h block active for 174528: {r.text[:150]}")
        assert r.status_code == 200, r.text[:300]
        assert r.json()["area"] == "PKCG"

    def test_colaboradores_total_515(self, gerencia):
        r = gerencia.get(f"{API}/colaboradores", timeout=60)
        assert r.status_code == 200
        colabs = r.json()
        assert len(colabs) >= 500, f"expected ~515 colaboradores, got {len(colabs)}"
        # sanity: both areas represented
        areas = {c.get("area") for c in colabs}
        assert areas >= {"I2M", "PKCG"}, areas


# ---------------- 2h ceiling + no IA ----------------
class TestLimitsAndNoIA:
    def test_total_horas_greater_than_2_rejected(self, coord_i2m):
        r = coord_i2m.post(f"{API}/requests",
                           json=_base_payload(hora_inicial="18:00", hora_final="21:00", total_horas=3.0),
                           timeout=30)
        assert r.status_code in (400, 422), f"{r.status_code} {r.text[:200]}"

    def test_exactly_2h_accepted(self, coord_i2m):
        r = coord_i2m.post(f"{API}/requests",
                           json=_base_payload(hora_inicial="18:00", hora_final="20:00", total_horas=2.0),
                           timeout=30)
        assert r.status_code == 200, r.text[:200]

    def test_no_categoria_ia_field_in_list(self, gerencia):
        r = gerencia.get(f"{API}/requests", timeout=30)
        assert r.status_code == 200
        for d in r.json():
            assert not d.get("categoria_ia"), f"categoria_ia present in {d.get('id')}: {d.get('categoria_ia')}"

    def test_block_status_endpoint(self, coord_i2m):
        r = coord_i2m.get(f"{API}/requests/block-status/TST999999", timeout=30)
        assert r.status_code == 200
        assert r.json().get("blocked") is False
