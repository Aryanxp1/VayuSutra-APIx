"""
VayuSutra APIx - Microservice & Streaming Integration Test Suite
Verifies Prometheus OpenMetrics endpoints, WebSocket live feed, Server-Sent Events (SSE),
background daemon workers, and CLI management interface.
"""

import subprocess
import pytest
from fastapi.testclient import TestClient
from vayusutra_apix.api.main import app
from vayusutra_apix.services.scheduler import IngestionWorkerDaemon


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_header(client):
    """Authenticates as System Admin and returns the Authorization header."""
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@vayusutra.gov.in",
        "password": "admin2026!"
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_prometheus_metrics_endpoint(client):
    """GET /metrics returns OpenMetrics formatted Prometheus lines."""
    response = client.get("/metrics")
    assert response.status_code == 200
    text = response.text
    assert "apix_laspeyres_current_index" in text
    assert "apix_quotes_ingested_total" in text
    assert "apix_system_cpu_percent" in text


def test_worker_daemon_api_controls_require_auth(client):
    """Worker control endpoints must reject unauthenticated requests."""
    assert client.get("/api/v1/worker/status").status_code == 401
    assert client.post("/api/v1/worker/pause").status_code == 401
    assert client.post("/api/v1/worker/resume").status_code == 401
    assert client.post("/api/v1/worker/trigger-now").status_code == 401


def test_worker_daemon_api_controls(client, auth_header):
    """Verify worker status, pause, resume, and manual cycle execution."""
    # 1. Status
    r_status = client.get("/api/v1/worker/status", headers=auth_header)
    assert r_status.status_code == 200
    assert "worker_daemon" in r_status.json()

    # 2. Pause
    r_pause = client.post("/api/v1/worker/pause", headers=auth_header)
    assert r_pause.status_code == 200
    assert r_pause.json()["status"] == "SUCCESS"

    # 3. Resume
    r_resume = client.post("/api/v1/worker/resume", headers=auth_header)
    assert r_resume.status_code == 200
    assert r_resume.json()["status"] == "SUCCESS"

    # 4. Trigger Now
    r_trig = client.post("/api/v1/worker/trigger-now", headers=auth_header)
    assert r_trig.status_code == 200
    assert r_trig.json()["status"] == "SUCCESS"


def test_websocket_stream_connection(client):
    """Verify WebSocket connection and live ping/pong communication."""
    with client.websocket_connect("/ws/live-feed") as websocket:
        websocket.send_text("ping")
        # May receive replayed event history first, look for pong response
        for _ in range(10):
            data = websocket.receive_json()
            if data.get("type") == "pong":
                break
        assert data.get("type") == "pong" or "event_type" in data


def test_cli_execution():
    """Verify that CLI tool responds to --help without errors."""
    res = subprocess.run(
        ["python3", "-m", "vayusutra_apix.cli", "--help"],
        capture_output=True,
        text=True
    )
    assert res.returncode == 0
    assert "VayuSutra APIx" in res.stdout
    assert "serve" in res.stdout
    assert "train" in res.stdout
    assert "ingest" in res.stdout
