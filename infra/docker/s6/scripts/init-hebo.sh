#!/bin/sh
set -e

# init-hebo — oneshot bootstrap (runs before any longrun services)
#
# 1. (standalone only) Create HEBO_DATA_DIR and generate/persist AUTH_SECRET
# 2. Write AUTH_SECRET to s6 environment so longruns inherit it
# 3. Run Prisma migrations for the schemas this mode owns

HEBO_MODE="${HEBO_MODE:-standalone}"
HEBO_DATA_DIR="${HEBO_DATA_DIR:-/data}"

# ── 1. Secret generation / persistence (standalone only) ──
# In ECS modes AUTH_SECRET is injected via environment; no /data volume exists.
if [ "$HEBO_MODE" = "standalone" ]; then
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
fi

# Write AUTH_SECRET to s6 environment so longruns inherit it
if [ -n "${AUTH_SECRET}" ]; then
  printf '%s' "${AUTH_SECRET}" > /run/s6/container_environment/AUTH_SECRET
fi

# ── 2. Run Prisma migrations for schemas owned by this mode ──
if [ "$HEBO_MODE" = "standalone" ] || [ "$HEBO_MODE" = "api" ]; then
  echo "[init] Running API schema migrations"
  DATABASE_URL="${DATABASE_URL}?schema=api" \
    bunx prisma migrate deploy --schema /app/prisma/api/schema.prisma
fi

if [ "$HEBO_MODE" = "standalone" ] || [ "$HEBO_MODE" = "auth" ]; then
  echo "[init] Running Auth schema migrations"
  DATABASE_URL="${DATABASE_URL}?schema=auth" \
    bunx prisma migrate deploy --schema /app/prisma/auth/schema.prisma
fi

echo "[init] Bootstrap complete (HEBO_MODE=${HEBO_MODE})"
