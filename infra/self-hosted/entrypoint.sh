#!/bin/sh
set -e

# Auto-generate AUTH_SECRET if not provided
if [ -z "$AUTH_SECRET" ]; then
  if [ -f /data/.auth_secret ]; then
    export AUTH_SECRET=$(cat /data/.auth_secret)
  else
    export AUTH_SECRET=$(head -c 32 /dev/urandom | base64)
    mkdir -p /data
    echo "$AUTH_SECRET" > /data/.auth_secret
  fi
fi

# Derive per-schema DATABASE_URLs from the base DATABASE_URL
build_schema_url() {
  # Append or replace the schema search param
  echo "${DATABASE_URL}$(echo "$DATABASE_URL" | grep -q '?' && echo '&' || echo '?')schema=$1"
}

API_DATABASE_URL=$(build_schema_url api)
AUTH_DATABASE_URL=$(build_schema_url auth)

# Create PostgreSQL schemas if they don't exist (requires psql-compatible URL)
echo "Running Prisma migrations..."
DATABASE_URL="$API_DATABASE_URL" bunx prisma migrate deploy --schema=/app/prisma/api/schema.prisma
DATABASE_URL="$AUTH_DATABASE_URL" bunx prisma migrate deploy --schema=/app/prisma/auth/schema.prisma

# Start all services
/app/api-server &
/app/auth-server &
/app/gateway-server &
caddy run --config /etc/caddy/Caddyfile &

# Wait for any process to exit, then exit all
wait -n
exit $?
