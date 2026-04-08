#!/bin/sh
set -e

# init-hebo — oneshot bootstrap (runs before any longrun services)
#
# 1. Create HEBO_DATA_DIR
# 2. Generate and persist AUTH_SECRET if not set
# 3. Run Prisma migrations (fail fast)

HEBO_DATA_DIR="${HEBO_DATA_DIR:-/data}"

# ── 1. Ensure data directory exists ──
mkdir -p "${HEBO_DATA_DIR}/secrets"

# ── 2. AUTH_SECRET generation / persistence ──
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
  # Persist user-provided secret for consistency across restarts
  printf '%s' "${AUTH_SECRET}" > "${SECRET_FILE}"
  chmod 600 "${SECRET_FILE}"
fi

# Write AUTH_SECRET to s6 environment so longruns inherit it
printf '%s' "${AUTH_SECRET}" > /run/s6/container_environment/AUTH_SECRET

# ── 3. Derive migration DATABASE_URL ──
# DATABASE_URL should be set via compose (without schema param).
# Prisma migrate deploy reads DATABASE_URL directly.
if [ -z "${DATABASE_URL}" ]; then
  echo "[init] WARNING: DATABASE_URL not set, migrations may fail"
fi

# ── 4. Run Prisma migrations (sequential, fail fast) ──
echo "[init] Running API schema migrations"
DATABASE_URL="${DATABASE_URL}?schema=api" \
  bunx prisma migrate deploy --schema /app/prisma/api/schema.prisma

echo "[init] Running Auth schema migrations"
DATABASE_URL="${DATABASE_URL}?schema=auth" \
  bunx prisma migrate deploy --schema /app/prisma/auth/schema.prisma

echo "[init] Bootstrap complete"
