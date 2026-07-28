#!/bin/bash
# Hebo self-hosted — provision a Compute Engine VM in GCP running the
# docker-compose stack (hebo + postgres + greptimedb + caddy), fronted by
# HTTPS. The image is pushed to GHCR (no secrets are baked into it — see
# build-image.sh); once the package is set public, the VM needs no pull
# credentials.
#
# Usage: ./deploy.sh <environment>
#   e.g. ./deploy.sh qa           (auto sslip.io hostnames, no domain needed)
#        ./deploy.sh production   (your own domain — edit environments/production.env first)
#
# Requires `docker login ghcr.io` locally with push access first, e.g.:
#   gh auth refresh -h github.com -s write:packages,read:packages
#   echo $(gh auth token) | docker login ghcr.io -u buibaoanh --password-stdin
#
# After the first push, set the package to public (one-time):
#   https://github.com/orgs/3cat-Sdn-Bhd/packages/container/3cat-selfhosted/settings
#
# Config lives in environments/<environment>.env. Review every command
# before running — this is meant to be read and executed deliberately,
# not blindly trusted.
set -euo pipefail

ENV_NAME="${1:?Usage: $0 <environment>   (see infra/self-hosted/gcp/environments/*.env)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/environments/${ENV_NAME}.env"

[ -f "$ENV_FILE" ] || { echo "No such environment config: $ENV_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

if [ "$PROJECT_ID" = "CHANGE_ME" ]; then
  echo "Edit $ENV_FILE and set a real PROJECT_ID first." >&2
  exit 1
fi
if [ "$DOMAIN_MODE" = "custom" ] && [ "$BASE_DOMAIN" = "hebo.yourdomain.com" ]; then
  echo "Edit $ENV_FILE and set a real BASE_DOMAIN first." >&2
  exit 1
fi

VM_NAME="hebo-${ENV_NAME}"
STATIC_IP_NAME="hebo-ip-${ENV_NAME}"
DATA_DISK_NAME="hebo-data-${ENV_NAME}"
GHCR_REPO="ghcr.io/3cat-sdn-bhd/3cat-selfhosted"
IMAGE_TAG="${GHCR_REPO}:${ENV_NAME}"
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"
LABELS="app=hebo,env=${ENV_NAME}"

gcloud config set project "$PROJECT_ID"
gcloud services enable compute.googleapis.com

# ── Reserve a static external IP first — it's the anchor for sslip.io
#    mode and for DNS stability across VM recreation either way ──
gcloud compute addresses create "$STATIC_IP_NAME" --region="$REGION" --labels="$LABELS" \
  || echo "Static IP already exists, skipping."

STATIC_IP="$(gcloud compute addresses describe "$STATIC_IP_NAME" --region="$REGION" --format='value(address)')"
echo "Reserved static IP: $STATIC_IP"

# ── Compute the 5 service hostnames for this environment ──
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

    echo
    echo "Point these A records at ${STATIC_IP} before continuing:"
    echo "  ${CONSOLE_DOMAIN}"
    echo "  ${API_DOMAIN}"
    echo "  ${GATEWAY_DOMAIN}"
    echo "  ${AUTH_DOMAIN}"
    echo "  ${MCP_DOMAIN}"
    echo
    read -r -p "Press enter once DNS is in place (Let's Encrypt needs it resolving)... "
    ;;
  *)
    echo "Unknown DOMAIN_MODE '$DOMAIN_MODE' in $ENV_FILE (expected sslip or custom)" >&2
    exit 1
    ;;
esac

# ── Build + push the custom image (see build-image.sh for what/why) ──
IMAGE_TAG="$IMAGE_TAG" \
  API_DOMAIN="$API_DOMAIN" AUTH_DOMAIN="$AUTH_DOMAIN" GATEWAY_DOMAIN="$GATEWAY_DOMAIN" \
  "$SCRIPT_DIR/build-image.sh"

# ── Firewall: SSH only via Identity-Aware Proxy (no public port 22);
#    80/443 public — required for Let's Encrypt's HTTP-01 challenge and
#    for anyone to reach the site over HTTPS. Hebo's app ports (8520-8524)
#    and Postgres/GreptimeDB aren't published to the host at all — Caddy
#    reaches them over the compose network by service name. Rules are
#    per-environment so qa/production can coexist without colliding. ──
gcloud compute firewall-rules create "hebo-allow-iap-ssh-${ENV_NAME}" \
  --direction=INGRESS --action=ALLOW --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 \
  --network=default \
  --target-tags="$VM_NAME" \
  || echo "Firewall rule hebo-allow-iap-ssh-${ENV_NAME} already exists, skipping."

gcloud compute firewall-rules create "hebo-allow-web-${ENV_NAME}" \
  --direction=INGRESS --action=ALLOW --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --network=default \
  --target-tags="$VM_NAME" \
  || echo "Firewall rule hebo-allow-web-${ENV_NAME} already exists, skipping."

# ── Persistent disk for Postgres + GreptimeDB data ──
gcloud compute disks create "$DATA_DISK_NAME" --zone="$ZONE" --size="$DATA_DISK_SIZE" --type=pd-balanced \
  --labels="$LABELS" \
  || echo "Data disk already exists, skipping."

# ── Render the startup script template with the real image + domains ──
RENDERED_SCRIPT="$(mktemp)"
sed \
  -e "s|__HEBO_IMAGE__|${IMAGE_TAG}|g" \
  -e "s|__CONSOLE_DOMAIN__|${CONSOLE_DOMAIN}|g" \
  -e "s|__API_DOMAIN__|${API_DOMAIN}|g" \
  -e "s|__GATEWAY_DOMAIN__|${GATEWAY_DOMAIN}|g" \
  -e "s|__AUTH_DOMAIN__|${AUTH_DOMAIN}|g" \
  -e "s|__MCP_DOMAIN__|${MCP_DOMAIN}|g" \
  "$SCRIPT_DIR/startup-script.sh.tmpl" > "$RENDERED_SCRIPT"

# ── The VM itself. Public GHCR package means no pull credentials are
#    needed on the VM at all — default scopes are fine. Re-running
#    against an existing VM just refreshes its startup-script metadata
#    (new image tag/domains) instead of failing. ──
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" >/dev/null 2>&1; then
  echo "VM $VM_NAME already exists — updating startup-script metadata."
  gcloud compute instances add-metadata "$VM_NAME" --zone="$ZONE" \
    --metadata-from-file=startup-script="$RENDERED_SCRIPT"
  UPDATED_EXISTING_VM=1
else
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE_TYPE" \
    --image-family="$IMAGE_FAMILY" --image-project="$IMAGE_PROJECT" \
    --boot-disk-size="$BOOT_DISK_SIZE" \
    --disk="name=$DATA_DISK_NAME,device-name=hebo-data,mode=rw,boot=no" \
    --address="$STATIC_IP" \
    --tags="$VM_NAME" \
    --labels="$LABELS" \
    --metadata-from-file=startup-script="$RENDERED_SCRIPT"
  UPDATED_EXISTING_VM=0
fi

rm -f "$RENDERED_SCRIPT"

cat <<EOF

Done. [$ENV_NAME] VM external IP: $STATIC_IP

Once boot + Let's Encrypt provisioning finish (a minute or two), the app is at:
  Console:  https://${CONSOLE_DOMAIN}
  API:      https://${API_DOMAIN}
  Gateway:  https://${GATEWAY_DOMAIN}
  Auth:     https://${AUTH_DOMAIN}
  MCP:      https://${MCP_DOMAIN}   (no auth layer — demo tool only, see earlier audit)

Real secrets (OAuth/SMTP/LLM provider keys, a stronger AUTH_SECRET, etc.)
aren't set by this script — edit them directly on the VM and restart:
  gcloud compute ssh $VM_NAME --zone $ZONE --tunnel-through-iap
  sudo nano /opt/hebo/.env && cd /opt/hebo && sudo docker compose up -d

Tail boot/setup logs with:
  gcloud compute ssh $VM_NAME --zone $ZONE --tunnel-through-iap -- 'sudo journalctl -u google-startup-scripts -f'
EOF

if [ "$UPDATED_EXISTING_VM" = "1" ]; then
  cat <<EOF
This reused an existing VM — the new image was pushed but the running
containers won't pick it up until you apply the refreshed startup script:
  gcloud compute ssh $VM_NAME --zone $ZONE --tunnel-through-iap -- \\
    'sudo google_metadata_script_runner startup'
EOF
fi

# Want automated backups of $DATA_DISK_NAME? See `gcloud compute resource-policies
# create snapshot-schedule` / `gcloud compute disks add-resource-policies`.
