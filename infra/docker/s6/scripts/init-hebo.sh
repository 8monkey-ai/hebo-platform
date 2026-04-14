#!/bin/sh
set -e

# init-hebo — oneshot bootstrap (runs before any longrun services)
#
# Standalone mode: run Prisma migrations
# ECS single-role modes: skip (Lambda migrator handles DB, SST handles secrets)

HEBO_MODE="${HEBO_MODE:-standalone}"

if [ "$HEBO_MODE" != "standalone" ]; then
  echo "[init] Skipping bootstrap (HEBO_MODE=${HEBO_MODE}, managed by SST)"
  exit 0
fi

# ── Run Prisma migrations ──
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

echo "[init] Bootstrap complete"
