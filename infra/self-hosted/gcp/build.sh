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
# live in /opt/hebo/.env on the VM, set over SSH, so the image can stay a
# public GHCR package (see deploy.sh for the one-time visibility step).
#
# Requires `docker login ghcr.io` locally with push access first, e.g.:
#   gh auth refresh -h github.com -s write:packages,read:packages
#   echo $(gh auth token) | docker login ghcr.io -u buibaoanh --password-stdin
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

GHCR_REPO="ghcr.io/3cat-sdn-bhd/hebo-platform-selfhosted"
IMAGE_TAG="${GHCR_REPO}:${ENV_NAME}-${VERSION}"

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
