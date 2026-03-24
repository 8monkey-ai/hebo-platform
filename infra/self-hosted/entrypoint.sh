#!/bin/sh
set -e

# Auto-generate AUTH_SECRET if not provided, persist across restarts
if [ -z "$AUTH_SECRET" ]; then
  if [ -f /data/.auth_secret ]; then
    export AUTH_SECRET=$(cat /data/.auth_secret)
  else
    export AUTH_SECRET=$(head -c 32 /dev/urandom | base64)
    mkdir -p /data
    echo "$AUTH_SECRET" > /data/.auth_secret
  fi
fi

# Default infrastructure env vars
: "${DATABASE_URL:=postgresql://postgres:password@postgres:5432/hebo}"
export DATABASE_URL
: "${GREPTIME_HOST:=greptimedb}"
export GREPTIME_HOST

DATABASE_URL="${DATABASE_URL}?schema=api" bunx prisma migrate deploy --config=/app/apps/api/prisma.config.ts
DATABASE_URL="${DATABASE_URL}?schema=auth" bunx prisma migrate deploy --config=/app/apps/auth/prisma.config.ts

bun /app/api-server.js &
api_pid=$!
bun /app/auth-server.js &
auth_pid=$!
bun /app/gateway-server.js &
gateway_pid=$!
caddy run --config /etc/caddy/Caddyfile &
caddy_pid=$!

while true; do
  for pid in "$api_pid" "$auth_pid" "$gateway_pid" "$caddy_pid"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      wait "$pid"
      exit $?
    fi
  done
  sleep 1
done
