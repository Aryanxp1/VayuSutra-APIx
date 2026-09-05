# VayuSutra APIx — National Airfare Intelligence & Inflation Decision Platform

**Measure • Explain • Forecast • Simulate**
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An aviation intelligence platform for **airfare price indices, corridor analytics, forecasting, simulation, data trust, anomaly detection and policy intelligence** — built for the **Smart India Hackathon 2026 (Problem Statement SIH26056)**.

**Commissioned for:** Ministry of Statistics and Programme Implementation (MoSPI), Government of India
**Beneficiaries:** National Statistical Office (NSO) · Reserve Bank of India (RBI) Monetary Policy Committee · Directorate General of Civil Aviation (DGCA)
**Official macro reference catalog:** [https://esankhyiki.mospi.gov.in](https://esankhyiki.mospi.gov.in) — Group 6.1.03, Transport & Communication

---

## Table of Contents

1. [Overview](#overview)
2. [Key Capabilities](#key-capabilities)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Data Sources & Provenance](#data-sources--provenance)
6. [Getting Started (Local Development)](#getting-started-local-development)
7. [API Documentation](#api-documentation)
8. [Deployment](#deployment)
9. [Repository Layout](#repository-layout)
10. [Limitations & Disclaimers](#limitations--disclaimers)
11. [Team](#team)
12. [License](#license)

---

## Overview

VayuSutra APIx modernizes the measurement of aircraft-influenced retail inflation. It automates what was previously a manual, 30-day airport-counter price collection into a high-frequency quantitative pipeline that:

- **Collects** online airfare quotes from multiple airline & OTA channels under a strict ethical scraping policy (token-bucket rate limiter, `robots.txt` compliance, IP jitter);
- **Cleans & de-biases** multi-source listings via multi-OTA deduplication and MAD modified z-score outlier filtering;
- **Computes** statutory international price indices — Jevons elementary means, Laspeyres, Paasche, and Superlative Fisher / Törnqvist / Walsh indices;
- **Transmits** index changes into Transport (8.59%) and headline CPI in basis points;
- **Nowcasts** forward price movement with multi-model ML ensembles and 95% confidence bands;
- **Explains** market moves with CPI decomposition waterfalls, pressure scores, and anomaly detection;
- **Simulates** policy shocks with a What-If scenario engine;
- **Verifies** data with a Data Trust Center (0–100) and cryptographically signed provenance;
- **Answers** policy questions through a data-grounded, zero-hallucination AI Policy Analyst.

The platform ships a **FastAPI REST API**, a live WebSocket event stream, Prometheus OpenMetrics, a self-contained HTML5 command center, and a **React + TypeScript intelligence dashboard**.

---

## Key Capabilities

| Area | Capability |
| :--- | :--- |
| Index Engine | Real-time Jevons / Laspeyres / Paasche / Superlative Fisher indices with CPI basis-point transmission |
| Corridor Analytics | 360° route intelligence, route comparators, 20×5 airfare heatmap matrix, day-of-week & seasonal factors |
| Forecasting | Multi-model framework (ETS, AR, GBDT, ensemble) with walk-forward validation and 95% CI inflation cones |
| Simulation | Policy What-If simulator (airfare shock %, ATF fuel %, demand %) |
| Fare Decomposition | Statutory fare decomposer (base fare / fuel surcharge / GST / fees) & route CPI waterfall |
| Data Trust | 7-dimension Data Trust Scorecard, source consensus, freshness & coverage monitoring |
| Provenance | SHA-256-signed quote records, hierarchical cell drill-down, tamper-evident audit trail |
| Anomaly Detection | Rolling-z / EWMA / horizon-inversion & source-disagreement detectors with alert rules |
| Reports | Automated daily intelligence dossiers (JSON & CSV export) |
| AI Policy Analyst | Query engine grounded strictly in API statistics with zero-hallucination answers |
---

## Architecture

```
+----------------------+   +----------------------+   +-------------------------+
| Airline Ingestion    |   | Multi-OTA Connectors |   | MoSPI eSankhyiki Macro  |
| 6E, AI, IX, QP, SG   |   | MMT, EaseMyTrip,     |   | Catalog (Group 6.1.03)  |
+----------+-----------+   +----------+-----------+   +------------+------------+
           |                         |                               |
           +------------+------------+-------------------------------+
                        v
          +-----------------------------+
          |   ETHICAL SCRAPING           |
          |   • Token bucket (1.5 rps)   |
          |   • robots.txt compliance    |
          |   • IP jitter (50–180 ms)    |
          +--------------+--------------+
                         v
          +-----------------------------+         +-------------+
          |   CLEANING & DE-BIASING     |<------->|  SQLite WAL |
          |   • Multi-OTA dedup         |         |  Database   |
          |   • MAD modified z-score    |         +-------------+
          +--------------+--------------+
                         v
          +-----------------------------+
          |  SUPERLATIVE INDEX MATH     |  Jevons • Laspeyres • Paasche •
          |  (UN/ILO methodology)       |  Fisher • Törnqvist • Walsh
          +--------------+--------------+
                         v
   +---------------------+--------------------+
   v                                          v
+----------------------------+     +--------------------------+
| FASTAPI APPLICATION        |     | ML NOWCAST ENSEMBLE      |
| REST / WebSockets /        |     | 15-signal Ridge + GBDT   |
| Prometheus / Worker Daemon |     | 14-day forecast (95% CI) |
+------------+---------------+     +------------+-------------+
             |                                    |
             +----------------+-------------------+
                              v
        +-----------------------------------------+
        | UI LAYER: React/Vite dashboard +        |
        | embedded HTML5 Bento command center     |
        +-----------------------------------------+
```

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| Backend | Python 3.11+ · FastAPI · Pydantic 2 · Uvicorn / Gunicorn |
| Storage | SQLite (Write-Ahead Logging) with thread-safe pooling |
| Data & Math | pandas · NumPy · SciPy · scikit-learn |
| Scraping | aiohttp · token-bucket rate limiters · robots.txt checker · eSankhyiki connector |
| Frontend | React 19 · TypeScript · Vite · Zustand · Recharts · React Router · lucide-react |
| Observability | prometheus-client / OpenMetrics · structured logging · live WebSocket feed |
| Deployment | Docker · Docker Compose · Kubernetes manifests · Nginx · systemd · Vercel serverless · GitHub Actions |

---

## Data Sources & Provenance

Every output carries an explicit **data tag** so consumers always know what they are looking at. The API surfaces these tiers as `source_type` / `data_tag` fields (`OFFICIAL`, `DERIVED`, `MODELLED`).

| Tier | Examples | Notes |
| :--- | :--- | :--- |
| **Official** | `data/mospi_esankhyiki_cpi_actual.csv`, `data/dgca_citypair_traffic_actual.csv` | Public government statistics (MoSPI eSankhyiki catalog, DGCA city-pair traffic), sourced from official open publications. |
| **Derived** | Real-time price indices, heatmap matrix, CPI decomposition, pressure scores, provenance records | Computed by the platform's econometric engine from collected / cleaned quote data. Tagged `DERIVED`. |
| **Modelled / Simulated** | Forecast cones, What-If scenario outcomes, AI policy analyst answers, backtest benchmarks | Produced by statistical models from historical patterns — **not** observed market data. Tagged `MODELLED` / `SIMULATED`. |

> **Honest-data disclaimer:** bundled sample indices, forecasts, and demo dashboard content are demonstration outputs generated from seed/backtest data. They are **not** live official market data and must not be quoted as such. Any mention of "live" refers to the platform's *capability* to ingest real quotes when connected to licensed feeds — always validate outputs against official statistics before use.
---

## Getting Started (Local Development)

### Prerequisites
- Python 3.11+ and Node.js 18+ (for the frontend)
- (Optional) Docker 24+ for containerized runs

### 1. Backend

```bash
# create & activate a virtual environment (Windows: .venv\Scripts\activate)
python -m venv .venv
source .venv/bin/activate

# install dependencies
pip install -r requirements.txt

# configure local env (then set AUTH_SECRET_KEY to a strong random value)
cp .env.example .env

# start the FastAPI service
uvicorn vayusutra_apix.api.main:app --reload --port 8000
```

On first start the application automatically initialises the SQLite schema, RBAC users, and seeds the demo dataset (35-day backtest + nowcast model) — so **no `.db` file is checked into the repository**.

Verify: `curl http://localhost:8000/api/v1/health`

### 2. Frontend (React intelligence dashboard)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/ws` to the backend at `http://127.0.0.1:8000`.

### 3. Tests

```bash
pytest -v
```

### Demo access
The API ships demo persona login endpoints (MoSPI, RBI, DGCA, Admin roles) under `/api/v1/auth/demo-*` — see `vayusutra_apix/auth/service.py` (`PRE_SEEDED_USERS`). Demo credentials are **development-only** and must be replaced by real identity management for any production deployment.

---

## API Documentation

With the backend running, browse the interactive docs:

- Swagger UI: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- ReDoc: [`http://localhost:8000/redoc`](http://localhost:8000/redoc)
- Health: `GET /api/v1/health`
- Live metrics: `GET /metrics` (Prometheus OpenMetrics)

Representative endpoints:

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/index/realtime` | Real-time national airfare price index |
| `GET` | `/api/v1/analytics/heatmap` | 20×5 airfare heatmap matrix |
| `GET` | `/api/v1/routes/{code}/intelligence` | Corridor intelligence dossier |
| `GET` | `/api/v1/forecast/national` | National forecast with 95% CI |
| `POST` | `/api/v1/scenario/simulate` | Policy What-If shock simulation |
| `GET` | `/api/v1/data-quality` | Data Trust Center scorecard |
| `GET` | `/api/v1/quotes/{quote_id}` | Provenance record (SHA-256 signed) |
| `GET` | `/api/v1/anomalies` | Active market anomalies |
| `POST` | `/api/v1/ai/analyst` | AI Policy Analyst query |

---

## Deployment

### Recommended: Render (single Docker container)

The repo-root `Dockerfile` builds **both** the React frontend and the FastAPI
backend into one image. One public domain then serves:

- `/` → React/Vite application
- `/api/v1/*`, `/ws/live-feed` → FastAPI API + WebSocket
- `/api/v1/stream/events` → SSE live feed

**Render setup:** Web Service → Docker → repo `Dockerfile`; add a **persistent
disk mounted at `/app/vayusutra_apix/data`** (SQLite DB + model artifacts) and
set **health check path `/api/v1/health`**.

**Required environment variables:**

| Variable | Example | Notes |
| :--- | :--- | :--- |
| `AUTH_SECRET_KEY` | `python3 -c "import secrets; print(secrets.token_hex(32))"` | Required — startup fails fast without it in production |
| `CORS_ORIGINS` | `https://your-app.onrender.com` | Comma-separated allowed origins |
| `WORKERS_COUNT` | `1` | Recommended for a single background-worker daemon |

### Local Docker test

```bash
docker build -t vayusutra-apix:prod .
docker run -d -p 8000:8000 \
  -e AUTH_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')" \
  -e WORKERS_COUNT=1 \
  vayusutra-apix:prod
curl -fsS http://localhost:8000/api/v1/health
```

### Alternative targets

- **Docker Compose:** `docker-compose up -d --build` (FastAPI + Nginx gateway + persistent volume)
- **Kubernetes:** manifests under `deploy/k8s/` (ConfigMap, Secret, Deployment, Service, Ingress, HPA)
- **Bare-metal / systemd:** unit file under `deploy/systemd/`
- **CI/CD:** GitHub Actions workflows under `.github/workflows/`

> **Security reminder:** always set a real `AUTH_SECRET_KEY` via the environment
> or your secret manager. Production startup **fails fast** if it is missing, the
> value in `.env.example` is a placeholder, and the development fallback in
> `vayusutra_apix/auth/security.py` is never used when `ENVIRONMENT=production`.

---

## Repository Layout

```
.
├── api/                  # Vercel serverless entrypoint
├── data/                 # Official reference datasets (CSV)
├── deploy/               # K8s, Nginx, systemd manifests & deploy scripts
├── docs/                 # Architecture audit, deployment, upgrade & Vercel guides
├── frontend/             # React + TypeScript intelligence dashboard (Vite)
├── vayusutra_apix/       # FastAPI application package
│   ├── ai_analyst/       # Data-grounded AI policy analyst
│   ├── alerts/           # Alert rule engine
│   ├── analytics/        # Heatmap, pressure, decomposition, consensus, temporal
│   ├── anomaly/          # Market anomaly detection
│   ├── api/              # REST endpoints & WebSocket stream
│   ├── auth/             # RBAC, tokens, demo users
│   ├── config/           # DB layer, route catalogs, thresholds
│   ├── data/             # Runtime SQLite (gitignored) + CSV datasets
│   ├── data_quality/     # 7-dimension Data Trust scorecard
│   ├── engine/           # Index math, backtest, ML nowcast trainer
│   ├── forecasting/      # Multi-model forecasting with validation
│   ├── pipeline/         # Cleaner & validator
│   ├── provenance/       # Quote tracing & SHA-256 audit
│   ├── reports/          # Daily intelligence reports
│   ├── scenario/         # Policy What-If simulator
│   ├── scrapers/         # Ethical connectors & market feed
│   ├── services/         # Metrics, streaming, scheduler daemon
│   ├── static/           # Embedded HTML5 command center + media
│   ├── tests/            # Pytest suite (49 tests)
│   └── validation/       # Model validation center
└── requirements.txt / Dockerfile / docker-compose.yml / vercel.json ...
```

---

## Limitations & Disclaimers

1. **Not official market data.** Forecasts, simulations and demo indices are modelled outputs, never guaranteed values. See [Data Sources & Provenance](#data-sources--provenance).
2. **Prototype scope.** This project is a Smart India Hackathon deliverable. Demo users, seed data and default settings are designed for demonstration, not production SLAs.
3. **Security.** A development-only fallback signing secret exists in `auth/security.py`; production deployments MUST set `AUTH_SECRET_KEY`. `CORS_ORIGINS=*` is a development convenience and should be restricted in production.
4. **No financial advice.** Analytics are statistical reference outputs for policy research; they do not constitute investment or regulatory advice.

---

## Team

**VayuSutra APIx** was designed, architected, engineered and deployed entirely by **Aryan Vishwakarma** (Smart India Hackathon 2026, SIH26056):

- **Aryan Vishwakarma** — Lead Architect & Principal System Architect. Owns the full stack: econometric index mathematics (Jevons / Laspeyres / Superlative Fisher / Walsh), CPI transmission ΔBps modelling, AI/ML nowcast ensemble (Ridge + GBDT), scraper & ingestion engine, FastAPI REST backend, WebSocket/SSE streaming, data-engineering pipeline, and the React/HTML5 visualization command center.

## License

Released under the [MIT License](LICENSE). Government reference datasets cited under [Data Sources & Provenance](#data-sources--provenance) and packaged in Docker remain subject to their respective source terms (MoSPI / DGCA / RBI).