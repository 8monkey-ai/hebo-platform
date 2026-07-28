# Shared by build.sh and deploy.sh — source this, don't execute it.
#
# Requires ENV_NAME, PROJECT_ID, REGION, DOMAIN_MODE, and (if
# DOMAIN_MODE=custom) BASE_DOMAIN already in scope (from the environment's
# .env file). Reserves the static IP if it doesn't exist yet, then sets
# STATIC_IP and the 5 service hostnames (CONSOLE_DOMAIN, API_DOMAIN,
# GATEWAY_DOMAIN, AUTH_DOMAIN, MCP_DOMAIN).

STATIC_IP_NAME="hebo-ip-${ENV_NAME}"

# gcloud compute addresses create doesn't accept --labels at creation time
# (unlike disks/instances) — set them in a separate call. Check-then-create
# instead of create-and-swallow-any-error, so a real failure (bad flag,
# permissions, quota) doesn't get misreported as "already exists".
if ! gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" >/dev/null 2>&1; then
  gcloud compute addresses create "$STATIC_IP_NAME" --region="$REGION"
  gcloud compute addresses update "$STATIC_IP_NAME" --region="$REGION" \
    --update-labels="app=hebo,env=${ENV_NAME}"
fi

STATIC_IP="$(gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" --format='value(address)')"

case "$DOMAIN_MODE" in
  sslip)
    CONSOLE_DOMAIN="console.${STATIC_IP}.sslip.io"
    API_DOMAIN="api.${STATIC_IP}.sslip.io"
    GATEWAY_DOMAIN="gateway.${STATIC_IP}.sslip.io"
    AUTH_DOMAIN="auth.${STATIC_IP}.sslip.io"
    MCP_DOMAIN="mcp.${STATIC_IP}.sslip.io"
    ;;
  custom)
    CONSOLE_DOMAIN="console.${BASE_DOMAIN}"
    API_DOMAIN="api.${BASE_DOMAIN}"
    GATEWAY_DOMAIN="gateway.${BASE_DOMAIN}"
    AUTH_DOMAIN="auth.${BASE_DOMAIN}"
    MCP_DOMAIN="mcp.${BASE_DOMAIN}"
    ;;
  *)
    echo "Unknown DOMAIN_MODE '$DOMAIN_MODE' (expected sslip or custom)" >&2
    exit 1
    ;;
esac
