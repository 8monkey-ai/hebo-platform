#!/bin/bash
# Hebo self-hosted — build and push a versioned image for one environment.
# Bakes that environment's real domains into the console bundle at build
# time (the published 8monkey/hebo-platform image bakes in
# localhost:8521/8522/8523, which only works for browsers on the same
# machine as the container — see apps/console/app/lib/env.ts).
#
# Doesn't touch any VM — run deploy.sh separately to point a server at the
# version built here. This is what lets you build several versions and
# choose which one a given server runs.
#
# Usage: ./build.sh <environment> [version]
#   e.g. ./build.sh qa            (version defaults to the current git short SHA)
#        ./build.sh qa v2-manual-test
#
# Only public domain names go into the image — no secrets. Real secrets
# live in /opt/hebo/.env on the VM, set over SSH. Published to a private
# Artifact Registry repo — the VM pulls via its own service account, no
# token/PAT to manage (tried making a public GHCR package instead, but
# org policy disables visibility changes there).
set -euo pipefail

ENV_NAME="${1:?Usage: $0 <environment> [version]   (see environments/*.env)}"
VERSION="${2:-$(git rev-parse --short HEAD)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/environments/${ENV_NAME}.env"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

[ -f "$ENV_FILE" ] || { echo "No such environment config: $ENV_FILE" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_FILE"

gcloud config set project "$PROJECT_ID" >/dev/null
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib-domains.sh"

AR_REPO_NAME="hebo"
gcloud services enable artifactregistry.googleapis.com
gcloud artifacts repositories create "$AR_REPO_NAME" \
  --repository-format=docker --location="$REGION" \
  --description="Hebo self-hosted images" \
  || echo "Artifact Registry repo already exists, skipping."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

IMAGE_TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO_NAME}/hebo-platform-selfhosted:${ENV_NAME}-${VERSION}"

docker build \
  -f "$REPO_ROOT/infra/docker/Dockerfile" \
  --build-arg "NODE_ENV=production" \
  --build-arg "VITE_API_URL=https://${API_DOMAIN}" \
  --build-arg "VITE_AUTH_URL=https://${AUTH_DOMAIN}" \
  --build-arg "VITE_GATEWAY_URL=https://${GATEWAY_DOMAIN}" \
  -t "$IMAGE_TAG" \
  "$REPO_ROOT"

docker push "$IMAGE_TAG"

echo
echo "Pushed: $IMAGE_TAG"
echo "Deploy it with: ./deploy.sh $ENV_NAME $VERSION"
