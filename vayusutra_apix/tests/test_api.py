"""
VayuSutra APIx - FastAPI Integration Test Suite
Verifies all REST API endpoints for HTTP 200 responses, schema validity, and execution.
"""

import pytest
from fastapi.testclient import TestClient
from vayusutra_apix.api.main import app
from vayusutra_apix.auth.security import create_access_token
from vayusutra_apix.auth.models import UserRole


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
    assert token
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_protected_route_rejected(client):
    """Every protected /api/v1/* data route must reject unauthenticated requests."""
    protected_paths = [
        "/api/v1/index/realtime",
        "/api/v1/analytics/heatmap",
        "/api/v1/forecast/national",
        "/api/v1/forecasting/models",
        "/api/v1/data-quality",
        "/api/v1/export/csv",
    ]
    for path in protected_paths:
        assert client.get(path).status_code == 401, f"expected 401 for {path}"


def test_invalid_token_rejected(client):
    res = client.get("/api/v1/index/realtime", headers={"Authorization": "Bearer not.a.real.token"})
    assert res.status_code == 401


def test_expired_token_rejected(client):
    expired = create_access_token(
        "USR-ADMIN-01", "admin", "admin@vayusutra.gov.in",
        UserRole.SYSTEM_ADMIN, custom_expiry=-3600
    )
    res = client.get("/api/v1/index/realtime", headers={"Authorization": f"Bearer {expired}"})
    assert res.status_code == 401


def test_dashboard_endpoint(client):
    """GET / returns HTML dashboard."""
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "VAYUSUTRA APIx" in response.text


def test_health_endpoint(client):
    """GET /api/v1/health returns system health telemetry (public)."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "telemetry" in data
    assert data["telemetry"]["dgca_routes_monitored"] == 20


def test_realtime_index_endpoint(client, auth_header):
    """GET /api/v1/index/realtime returns latest index data."""
    response = client.get("/api/v1/index/realtime", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert "master_laspeyres_index" in data
    assert "fisher_ideal_index" in data
    assert "cpi_transmission" in data
    assert data["cpi_transmission"]["transport_cpi_weight_pct"] == 8.59


def test_timeseries_endpoint(client, auth_header):
    """GET /api/v1/index/timeseries returns historical daily records."""
    response = client.get("/api/v1/index/timeseries?limit=10", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert len(data["data"]) > 0
    assert "laspeyres_index" in data["data"][0]


def test_routes_endpoint(client, auth_header):
    """GET /api/v1/routes returns all 20 DGCA routes with valid weights."""
    response = client.get("/api/v1/routes", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert data["total_routes"] == 20
    assert pytest.approx(data["total_weight"], 1e-4) == 1.0


def test_elasticity_endpoint(client, auth_header):
    """GET /api/v1/analytics/elasticity returns 5 advance purchase horizons."""
    response = client.get("/api/v1/analytics/elasticity", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert len(data["windows"]) == 5
    window_ids = [w["window_id"] for w in data["windows"]]
    assert window_ids == ["T+1", "T+7", "T+15", "T+30", "T+45"]


def test_cpi_impact_matrix(client, auth_header):
    """GET /api/v1/analytics/cpi-impact returns sensitivity scenarios."""
    response = client.get("/api/v1/analytics/cpi-impact", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert "sensitivity_stress_matrix" in data
    assert len(data["sensitivity_stress_matrix"]) > 0


def test_backtest_endpoint(client, auth_header):
    """GET /api/v1/backtest returns econometric validation metrics."""
    response = client.get("/api/v1/backtest", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert "pearson_r" in data
    assert "mape" in data
    assert data["pearson_r"] >= 0.80
    assert data["mape"] <= 4.5


def test_ingest_run_endpoint(client, auth_header):
    """POST /api/v1/ingest/run executes live ingestion pipeline."""
    response = client.post("/api/v1/ingest/run?custom_date_str=2026-08-26", headers=auth_header)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "ingestion_summary" in data
    assert "computed_indices" in data


def test_export_csv_endpoint(client, auth_header):
    """GET /api/v1/export/csv returns downloadable CSV stream."""
    response = client.get("/api/v1/export/csv", headers=auth_header)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "Calculation_Date" in response.text
    assert "Laspeyres_Airfare_Index" in response.text


def test_actual_datasets_endpoints(client, auth_header):
    """Verify actual dataset endpoints for MoSPI CPI, DGCA traffic, and quotes."""
    # 1. MoSPI CPI
    r_cpi = client.get("/api/v1/datasets/mospi-cpi", headers=auth_header)
    assert r_cpi.status_code == 200
    assert r_cpi.json()["count"] > 20

    # 2. DGCA Traffic
    r_dgca = client.get("/api/v1/datasets/dgca-traffic", headers=auth_header)
    assert r_dgca.status_code == 200
    assert r_dgca.json()["count"] == 20

    # 3. Live Flight Quotes
    r_quotes = client.get("/api/v1/datasets/flight-quotes?limit=10", headers=auth_header)
    assert r_quotes.status_code == 200
    assert "quotes" in r_quotes.json()


def test_live_fare_decomposer_calculator(client, auth_header):
    """Verify live fare decomposition and basis-point CPI calculation."""
    r_calc = client.post("/api/v1/calculator/decompose?route_code=DEL-BOM&base_plus_fuel_fare=6800", headers=auth_header)
    assert r_calc.status_code == 200
    data = r_calc.json()
    assert data["statutory_price_decomposition"]["total_gross_fare_payable_inr"] == 7851.0
    assert "transport_subgroup_impact_bps" in data["econometric_cpi_transmission"]


def test_superlative_and_regional_endpoints(client, auth_header):
    """Verify superlative comparison, regional breakdown, and cryptographic audit vault."""
    # 1. Superlative Matrix
    r_sup = client.get("/api/v1/index/superlative", headers=auth_header)
    assert r_sup.status_code == 200
    data_sup = r_sup.json()
    assert "superlative_matrix" in data_sup
    assert "fisher_ideal_superlative_index" in data_sup["superlative_matrix"]

    # 2. Regional Breakdown
    r_reg = client.get("/api/v1/index/regional", headers=auth_header)
    assert r_reg.status_code == 200
    data_reg = r_reg.json()
    assert "regional_hubs" in data_reg
    assert "delhi_ncr_corridor" in data_reg["regional_hubs"]

    # 3. Cryptographic Provenance
    r_aud = client.get("/api/v1/audit/provenance", headers=auth_header)
    assert r_aud.status_code == 200
    data_aud = r_aud.json()
    assert "cryptographic_hash_sha256" in data_aud
    assert data_aud["provenance_status"] == "TAMPER_PROOF_VALIDATED"
# ─── Phase 4: Anomaly Detection, Data Trust, Datasets & Alerts ───


def test_anomalies_methodology_and_real_labels(client, auth_header):
    """GET /api/v1/anomalies returns engine methodology + fully labelled real records."""
    res = client.get("/api/v1/anomalies", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    assert data["data_tag"] == "REAL_COMPUTED"
    assert data["methodology"]["engine"].startswith("MarketAnomalyDetector")
    for a in data["anomalies"]:
        assert a["metric"]
        assert a["confidence_score"] is not None
        assert a["explanation"]
        assert a["expected_range_min"] < a["observed_value"]
        assert a["severity"]


def test_dataset_catalog_live_counts(client, auth_header):
    """GET /api/v1/datasets/catalog computes counts/coverage live from the DB and CSVs."""
    res = client.get("/api/v1/datasets/catalog", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    assert data["total_datasets"] >= 9
    by_id = {d["dataset_id"]: d for d in data["catalog"]}
    assert by_id["DS-RAW-QUOTES"]["record_count"] > 0
    assert by_id["DS-MOSPI-CPI-603"]["record_count"] > 0
    assert by_id["DS-DGCA-TRAFFIC"]["record_count"] == 20
    assert data["source_type_breakdown"]["official"] >= 2
    assert data["source_type_breakdown"]["derived"] >= 3
    assert "generated_at" in data


def test_data_quality_sources_panel(client, auth_header):
    """GET /api/v1/data-quality/sources joins registry with live observation stats."""
    res = client.get("/api/v1/data-quality/sources", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    known_ids = {s["source_id"] for s in data["sources"]}
    assert {"SRC-6E", "SRC-ESANKHYIKI", "SRC-MMT"} <= known_ids
    indigo = next(s for s in data["sources"] if s["source_id"] == "SRC-6E")
    assert indigo["observations"] > 0
    assert indigo["share_of_panel_pct"] is not None
    assert indigo["coverage_start"]
    assert data["total_observations"] > 0
    assert all(s["health"] for s in data["sources"])


def test_alerts_evaluate_on_read_and_missing_404(client, auth_header):
    """GET /api/v1/alerts re-evaluates rules against live metrics; PATCH missing -> 404."""
    res = client.get("/api/v1/alerts", headers=auth_header)
    assert res.status_code == 200
    data = res.json()
    assert "current_metrics" in data
    assert "overall_trust_score" in data["current_metrics"]
    assert "metric_labels" in data
    for alert in data["alerts"]:
        assert alert["rule_id"]
        assert alert["message"].startswith("Observed")

    missing = client.patch("/api/v1/alerts/NOPE?new_status=RESOLVED", headers=auth_header)
    assert missing.status_code == 404


def test_alert_status_roundtrip(client, auth_header):
    """PATCH a real alert ACKNOWLEDGED -> filterable -> restored ACTIVE."""
    alerts = client.get("/api/v1/alerts", headers=auth_header).json()["alerts"]
    if not alerts:
        return
    aid = alerts[0]["alert_id"]
    ack = client.patch(f"/api/v1/alerts/{aid}?new_status=ACKNOWLEDGED&actor=testsuite", headers=auth_header)
    assert ack.status_code == 200
    assert ack.json()["status"] == "SUCCESS"
    filtered = client.get("/api/v1/alerts?status=ACKNOWLEDGED", headers=auth_header).json()["alerts"]
    assert any(a["alert_id"] == aid for a in filtered)
    # Restore so dedupe semantics remain intact for subsequent runs
    client.patch(f"/api/v1/alerts/{aid}?new_status=ACTIVE&actor=testsuite", headers=auth_header)
