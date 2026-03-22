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

# Run Prisma migrations (idempotent on restart)
DATABASE_URL="${DATABASE_URL}?schema=api" bun /app/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/api/schema.prisma
DATABASE_URL="${DATABASE_URL}?schema=auth" bun /app/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/auth/schema.prisma

# Start all services
/app/api-server &
/app/auth-server &
/app/gateway-server &
caddy run --config /etc/caddy/Caddyfile &

# If any process exits, stop the container
wait -n
exit $?
