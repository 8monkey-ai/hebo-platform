#!/bin/sh
set -e

# init-hebo — oneshot bootstrap (runs before any longrun services)
#
# 1. (standalone only) Create HEBO_DATA_DIR and generate/persist AUTH_SECRET
# 2. Write AUTH_SECRET to /run/hebo-env/ so longruns inherit it via s6-envdir
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

# Write AUTH_SECRET to a custom env dir so longruns pick it up via s6-envdir
mkdir -p /run/hebo-env
if [ -n "${AUTH_SECRET}" ]; then
  printf '%s' "${AUTH_SECRET}" > /run/hebo-env/AUTH_SECRET
fi

# ── 2. Run Prisma migrations for schemas owned by this mode ──
# Determine separator: & if DATABASE_URL already has query params, ? otherwise
case "$DATABASE_URL" in *"?"*) SEP="&";; *) SEP="?";; esac

if [ "$HEBO_MODE" = "standalone" ] || [ "$HEBO_MODE" = "api" ]; then
  echo "[init] Running API schema migrations"
  DATABASE_URL="${DATABASE_URL}${SEP}schema=api" \
    bunx --bun prisma migrate deploy --config /app/prisma/api/prisma.config.ts
fi

if [ "$HEBO_MODE" = "standalone" ] || [ "$HEBO_MODE" = "auth" ]; then
  echo "[init] Running Auth schema migrations"
  DATABASE_URL="${DATABASE_URL}${SEP}schema=auth" \
    bunx --bun prisma migrate deploy --config /app/prisma/auth/prisma.config.ts
fi

echo "[init] Cleaning up Prisma CLI cache"
rm -rf /root/.bun/install/cache /tmp/prisma* /root/.cache/prisma

echo "[init] Bootstrap complete (HEBO_MODE=${HEBO_MODE})"
