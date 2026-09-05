#!/bin/sh
# ==============================================================================
# VayuSutra APIx - Container Entrypoint
# ------------------------------------------------------------------------------
# * Ensures the persistent application data directory is writable by the runtime
#   user (SQLite DB, model artifacts and backtest CSVs live there).
# * Drops privileges from root to the `mospi` service user before running uvicorn.
# * WebSockets, the background ingestion daemon and SSE all run inside this one
#   long-lived process, so no external supervisor is needed.
# ==============================================================================
set -e

DATA_DIR="${DATA_DIR:-/app/vayusutra_apix/data}"
RUNAS_UID="${PUID:-10001}"
RUNAS_GID="${PGID:-10001}"

# Create the persistent data directory if it does not exist yet (e.g. first boot
# with a freshly attached Render persistent disk).
mkdir -p "${DATA_DIR}" "${DATA_DIR}/models"

if [ "$(id -u)" = "0" ]; then
    # Fresh persistent disks are mounted root-owned; re-own for the service user.
    chown -R "${RUNAS_UID}:${RUNAS_GID}" "${DATA_DIR}"
    chmod 775 "${DATA_DIR}" "${DATA_DIR}/models"
    exec tini -- setpriv --reuid "${RUNAS_UID}" --regid "${RUNAS_GID}" --init-groups \
        python3 -m uvicorn vayusutra_apix.api.main:app \
        --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WORKERS_COUNT:-4}" --log-level info
fi

# Non-root invocation (e.g. `docker run --user`): run uvicorn directly.
exec python3 -m uvicorn vayusutra_apix.api.main:app \
    --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WORKERS_COUNT:-4}" --log-level info