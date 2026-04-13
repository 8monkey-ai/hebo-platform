#!/bin/sh
set -e

# init-hebo — oneshot bootstrap (runs before any longrun services)
#
# Standalone mode: generate/persist AUTH_SECRET + run Prisma migrations
# ECS single-role modes: skip (Lambda migrator handles DB, SST handles secrets)

HEBO_MODE="${HEBO_MODE:-standalone}"
HEBO_DATA_DIR="${HEBO_DATA_DIR:-/data}"

if [ "$HEBO_MODE" != "standalone" ]; then
  echo "[init] Skipping bootstrap (HEBO_MODE=${HEBO_MODE}, managed by SST)"
  exit 0
fi

# ── 1. Generate / persist AUTH_SECRET ──
mkdir -p "${HEBO_DATA_DIR}/secrets"
SECRET_FILE="${HEBO_DATA_DIR}/secrets/auth_secret"

if [ -z "${AUTH_SECRET}" ]; then
  if [ -f "${SECRET_FILE}" ]; then
    echo "[init] Loading persisted AUTH_SECRET"
    AUTH_SECRET="$(cat "${SECRET_FILE}")"
  else
    echo "[init] Generating AUTH_SECRET"
    AUTH_SECRET="$(openssl rand -hex 32)"
    printf '%s' "${AUTH_SECRET}" > "${SECRET_FILE}"
    chmod 600 "${SECRET_FILE}"
  fi
else
  printf '%s' "${AUTH_SECRET}" > "${SECRET_FILE}"
  chmod 600 "${SECRET_FILE}"
fi
export AUTH_SECRET

# ── 2. Run Prisma migrations (standalone only) ──
if [ "$HEBO_MODE" = "standalone" ]; then
  if [ -z "${POSTGRES_URL}" ]; then
    echo "[init] ERROR: POSTGRES_URL is required for migrations" >&2
    exit 1
  fi

  echo "[init] Running API schema migrations"
  DATABASE_URL="${POSTGRES_URL}?schema=api" \
    bunx --bun prisma migrate deploy --config /app/prisma/api/prisma.config.ts

  echo "[init] Running Auth schema migrations"
  DATABASE_URL="${POSTGRES_URL}?schema=auth" \
    bunx --bun prisma migrate deploy --config /app/prisma/auth/prisma.config.ts

  echo "[init] Cleaning up Prisma CLI cache"
  rm -rf /root/.bun/install/cache /tmp/prisma* /root/.cache/prisma
fi

echo "[init] Bootstrap complete"
