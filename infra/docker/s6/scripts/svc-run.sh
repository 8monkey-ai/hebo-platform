#!/bin/sh
# Shared service runner for s6-overlay longruns.
# Usage: svc-run.sh <service-name> <allowed-modes> <exec-command...>
#   svc-run.sh svc-api "standalone api" /app/api
#   svc-run.sh svc-console "standalone" bun run vite preview --host 0.0.0.0 --port 8520
SVC_NAME="$1"; shift
ALLOWED_MODES="$1"; shift

HEBO_MODE="${HEBO_MODE:-standalone}"
for m in $ALLOWED_MODES; do
  if [ "$HEBO_MODE" = "$m" ]; then
    echo "[${SVC_NAME}] Starting (HEBO_MODE=${HEBO_MODE})"
    exec "$@"
  fi
done

echo "[${SVC_NAME}] Skipped (HEBO_MODE=${HEBO_MODE})"
exec s6-svc -Od .
