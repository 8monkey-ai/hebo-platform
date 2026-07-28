#!/bin/bash
# Builds a custom Hebo image with real public URLs baked into the console
# bundle at build time (the published 8monkey/hebo-platform image bakes in
# localhost:8521/8522/8523, which only works for browsers on the same
# machine as the container — see apps/console/app/lib/env.ts), and pushes
# it to Artifact Registry.
#
# Not meant to be run standalone — deploy.sh exports the required
# environment variables and calls this after computing the domains for
# the target environment.
set -euo pipefail

: "${PROJECT_ID:?PROJECT_ID must be set}"
: "${REGION:?REGION must be set}"
: "${AR_REPO:?AR_REPO must be set}"
: "${IMAGE_TAG:?IMAGE_TAG must be set}"
: "${API_DOMAIN:?API_DOMAIN must be set}"
: "${AUTH_DOMAIN:?AUTH_DOMAIN must be set}"
: "${GATEWAY_DOMAIN:?GATEWAY_DOMAIN must be set}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

gcloud config set project "$PROJECT_ID"
gcloud services enable artifactregistry.googleapis.com

gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker --location="$REGION" \
  --description="Hebo self-hosted images" \
  --labels="app=hebo" \
  || echo "Artifact Registry repo already exists, skipping."

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

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
