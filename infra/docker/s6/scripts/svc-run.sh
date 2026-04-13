#!/bin/sh
# Service runner for s6-overlay longruns.
# Derives the exec command from the service name.
# Usage: svc-run.sh <allowed-modes>
#   svc-run.sh "standalone api"

SVC_NAME="$(basename "$(pwd)")"
APP="${SVC_NAME#svc-}"
ALLOWED_MODES="$1"
HEBO_MODE="${HEBO_MODE:-standalone}"

case "$APP" in
  api)      CMD="bun /app/api/index.js" ;;
  auth)     CMD="bun /app/auth/index.js" ;;
  gateway)  CMD="bun /app/gateway/index.js" ;;
  mcp)      CMD="bun /app/mcp/index.js" ;;
  console)  CMD="bun /app/console/serve.ts" ;;
  *)        echo "[${SVC_NAME}] Unknown service"; exec s6-svc -Od . ;;
esac

for m in $ALLOWED_MODES; do
  if [ "$HEBO_MODE" = "$m" ]; then
    echo "[${SVC_NAME}] Starting"
    exec $CMD
  fi
done

echo "[${SVC_NAME}] Not active in HEBO_MODE=${HEBO_MODE}"
exec s6-svc -Od .
