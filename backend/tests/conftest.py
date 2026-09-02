import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL is missing from the process environment and /app/frontend/.env")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


def parse_credentials():
    """Parse the markdown credentials table in /app/memory/test_credentials.md."""
    path = Path("/app/memory/test_credentials.md")
    if not path.exists():
        return {}
    creds = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 3 and re.match(r"^[^@\s]+@[^@\s]+$", cells[1]):
            creds[cells[1].lower()] = cells[2]
    return creds


CREDS = parse_credentials()

ACCOUNTS = {
    "admin": ("admin@dhl.com", "ALL"),
    "gerencia": ("gerente@dhl.com", "ALL"),
    "coord_i2m": ("gestor@dhl.com", "I2M"),
    "coord_pkcg": ("coordenador.pkcg@dhl.com", "PKCG"),
    "sup_i2m": ("supervisor@dhl.com", "I2M"),
    "sup_pkcg": ("supervisor.pkcg@dhl.com", "PKCG"),
}


def login_session(key, area=None):
    """Return an authenticated requests.Session (HttpOnly cookie jar)."""
    email, user_area = ACCOUNTS[key]
    password = CREDS.get(email)
    if not password:
        pytest.skip(f"Missing credentials for {email} in /app/memory/test_credentials.md")
    s = requests.Session()
    payload = {"email": email, "password": password, "area": area or (user_area if user_area != "ALL" else "I2M")}
    r = s.post(f"{API}/auth/login", json=payload, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"Login failed for {email}: {r.status_code} {r.text[:300]}")
    s.user = r.json()
    return s


@pytest.fixture(scope="module")
def anon():
    return requests.Session()


@pytest.fixture(scope="module")
def gerencia():
    return login_session("gerencia")


@pytest.fixture(scope="module")
def admin():
    return login_session("admin")


@pytest.fixture(scope="module")
def coord_i2m():
    return login_session("coord_i2m")


@pytest.fixture(scope="module")
def coord_pkcg():
    return login_session("coord_pkcg")


@pytest.fixture(scope="module")
def sup_i2m():
    return login_session("sup_i2m")


@pytest.fixture(scope="module")
def sup_pkcg():
    return login_session("sup_pkcg")


def pytest_sessionfinish(session, exitstatus):
    """Purge TEST_-prefixed requests once, after ALL xdist workers finish.

    Guarded by `workerinput`: only the controller (or a serial run) performs the
    purge, so parallel workers never delete data still in use by their peers.
    """
    if hasattr(session.config, "workerinput"):
        return
    try:
        import asyncio
        from dotenv import load_dotenv
        from motor.motor_asyncio import AsyncIOMotorClient

        load_dotenv("/app/backend/.env")
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if not mongo_url or not db_name:
            return

        async def _purge():
            client = AsyncIOMotorClient(mongo_url)
            try:
                res = await client[db_name].requests.delete_many(
                    {"colaborador": {"$regex": "^TEST_"}}
                )
                print(f"\n[cleanup] removed {res.deleted_count} TEST_ requests")
            finally:
                client.close()

        asyncio.run(_purge())
    except Exception as exc:  # pragma: no cover - cleanup must never fail the suite
        print(f"[cleanup] skipped: {exc}")
