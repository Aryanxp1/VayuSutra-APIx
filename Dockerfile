# ==============================================================================
# VayuSutra APIx - Multi-Stage Production Dockerfile
# Ministry of Statistics and Programme Implementation (MoSPI) / RBI / DGCA
#
# Produces a single runtime image that:
#   1. builds the React/Vite frontend
#   2. installs backend dependencies
#   3. serves the built React SPA and the FastAPI API (including /ws) from one
#      long-running process
#   4. persists application data (SQLite DB, model artifacts, backtest CSVs)
#      under /app/vayusutra_apix/data (mount a volume / persistent disk there)
# ==============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Frontend builder (React / TypeScript / Vite)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS web-builder

WORKDIR /web

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Python dependency builder
# -----------------------------------------------------------------------------
FROM python:3.13-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 3: Minimal runtime (FastAPI + built React SPA)
# -----------------------------------------------------------------------------
FROM python:3.13-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app \
    ENVIRONMENT=production \
    WORKERS_COUNT=4

# Runtime tooling: curl (healthchecks), tini (PID1 init/signals)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tini \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user for security compliance (CIS Benchmark)
RUN groupadd -r -g 10001 mospi && useradd -r -g mospi -d /app -s /sbin/nologin -u 10001 mospi && \
    mkdir -p /app/vayusutra_apix/data /app/vayusutra_apix/static /app/frontend && \
    chown -R mospi:mospi /app

# Copy installed dependencies from builder
COPY --from=builder /install /usr/local

# Copy application source code (build context already excludes .git, node_modules,
# local databases, models, logs and secrets via .dockerignore)
COPY --chown=mospi:mospi . /app

# Copy the compiled React SPA (produced in Stage 1) into /app/frontend/dist
COPY --from=web-builder --chown=mospi:mospi /web/dist /app/frontend/dist

# Container entrypoint (root -> chown persistent data dir -> drop to mospi user)
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

# Automated container healthcheck probing the FastAPI health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/api/v1/health > /dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
