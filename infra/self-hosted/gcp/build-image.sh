#!/bin/bash
# Builds a custom Hebo image with real public domains baked into the console
# bundle at build time (the published 8monkey/hebo-platform image bakes in
# localhost:8521/8522/8523, which only works for browsers on the same
# machine as the container — see apps/console/app/lib/env.ts), and pushes
# it to GHCR.
#
# Only public domain names go into the image (VITE_API_URL etc.) — no
# secrets. Real secrets (AUTH_SECRET, DB credentials, provider keys) are
# set directly on the VM in /opt/hebo/.env, never baked into the image —
# so the image can stay public same as the upstream one (set the GHCR
# package visibility to public after the first push).
#
# Requires `docker login ghcr.io` to have been run locally with push
# access to IMAGE_TAG's namespace before calling this.
#
# Not meant to be run standalone — deploy.sh exports the required
# environment variables and calls this after computing the domains for
# the target environment.
set -euo pipefail

: "${IMAGE_TAG:?IMAGE_TAG must be set}"
: "${API_DOMAIN:?API_DOMAIN must be set}"
: "${AUTH_DOMAIN:?AUTH_DOMAIN must be set}"
: "${GATEWAY_DOMAIN:?GATEWAY_DOMAIN must be set}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

docker build \
  -f "$REPO_ROOT/infra/docker/Dockerfile" \
  --build-arg "NODE_ENV=production" \
  --build-arg "VITE_API_URL=https://${API_DOMAIN}" \
  --build-arg "VITE_AUTH_URL=https://${AUTH_DOMAIN}" \
  --build-arg "VITE_GATEWAY_URL=https://${GATEWAY_DOMAIN}" \
  -t "$IMAGE_TAG" \
  "$REPO_ROOT"

docker push "$IMAGE_TAG"

echo "Pushed: $IMAGE_TAG"
