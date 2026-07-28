#!/bin/bash
# Hebo self-hosted — point a Compute Engine VM at a specific, already-built
# image version. Build one first with ./build.sh.
#
# First run for an environment also provisions the static IP, firewall,
# data disk, and VM; later runs just update which version is running.
# Safe to re-run — everything is create-if-missing.
#
# Usage: ./deploy.sh <environment> <version>
#   e.g. ./deploy.sh qa a1b2c3d
#        ./deploy.sh production v1.4.0
#
# Config lives in environments/<environment>.env. Review every command
# before running — this is meant to be read and executed deliberately,
# not blindly trusted.
set -euo pipefail

ENV_NAME="${1:?Usage: $0 <environment> <version>   (build it first with ./build.sh)}"
VERSION="${2:?Usage: $0 <environment> <version>   (build it first with ./build.sh)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/environments/${ENV_NAME}.env"

[ -f "$ENV_FILE" ] || { echo "No such environment config: $ENV_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

if [ "$DOMAIN_MODE" = "custom" ] && [ "$BASE_DOMAIN" = "hebo.yourdomain.com" ]; then
  echo "Edit $ENV_FILE and set a real BASE_DOMAIN first." >&2
  exit 1
fi

VM_NAME="hebo-${ENV_NAME}"
DATA_DISK_NAME="hebo-data-${ENV_NAME}"
GHCR_REPO="ghcr.io/3cat-sdn-bhd/hebo-platform-selfhosted"
IMAGE_TAG="${GHCR_REPO}:${ENV_NAME}-${VERSION}"
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"
LABELS="app=hebo,env=${ENV_NAME}"

gcloud config set project "$PROJECT_ID"
gcloud services enable compute.googleapis.com

# ── Reserve/look up the static IP and compute the 5 service hostnames ──
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib-domains.sh"
echo "Static IP: $STATIC_IP"

if [ "$DOMAIN_MODE" = "custom" ]; then
  echo
  echo "Make sure these A records point at ${STATIC_IP} before continuing"
  echo "(Let's Encrypt needs them resolving to issue certs):"
  echo "  ${CONSOLE_DOMAIN}"
  echo "  ${API_DOMAIN}"
  echo "  ${GATEWAY_DOMAIN}"
  echo "  ${AUTH_DOMAIN}"
  echo "  ${MCP_DOMAIN}"
  echo
  read -r -p "Press enter once DNS is in place... "
fi

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

# ── Render the startup script template with the image version + domains ──
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
#    (new version/domains) instead of failing. ──
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

Done. [$ENV_NAME] now pointed at version $VERSION. VM external IP: $STATIC_IP

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
This reused an existing VM — the new version's metadata was written but
the running containers won't pick it up until you apply it:
  gcloud compute ssh $VM_NAME --zone $ZONE --tunnel-through-iap -- \\
    'sudo google_metadata_script_runner startup'
EOF
fi

# Want automated backups of $DATA_DISK_NAME? See `gcloud compute resource-policies
# create snapshot-schedule` / `gcloud compute disks add-resource-policies`.
