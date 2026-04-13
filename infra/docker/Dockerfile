# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
#  Hebo — single image, multi-mode (s6-overlay)
#
#  HEBO_MODE selects which services start:
#    standalone (default) — all services + console
#    api | auth | gateway | mcp — single role
#
#  Used for both self-hosted (standalone) and ECS (single-role) deployments.
# ---------------------------------------------------------------------------

ARG BUN_VERSION=1.3.12

########################  builder  ########################
FROM oven/bun:${BUN_VERSION} AS builder

ARG NODE_ENV
ENV CI=1 NODE_ENV=$NODE_ENV
WORKDIR /repo

# Copy dependency manifests first for better Docker cache
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/auth/package.json apps/auth/package.json
COPY apps/console/package.json apps/console/package.json
COPY apps/gateway/package.json apps/gateway/package.json
COPY apps/mcp/package.json apps/mcp/package.json
COPY packages/shared-api/package.json packages/shared-api/package.json
COPY packages/shared-data/package.json packages/shared-data/package.json
COPY packages/shared-ui/package.json packages/shared-ui/package.json
COPY packages/aikit-ui/package.json packages/aikit-ui/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN bun install --frozen-lockfile

# Copy remaining source and build
COPY . .
RUN bun run build

########################  runtime  ########################
FROM oven/bun:${BUN_VERSION}-slim AS runtime

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates curl xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Install s6-overlay
ARG TARGETARCH
RUN S6_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "x86_64") && \
    S6_BASE="https://github.com/just-containers/s6-overlay/releases/download/v3.2.0.2" && \
    curl -sSfL "${S6_BASE}/s6-overlay-noarch.tar.xz" | tar -C / -Jxpf - && \
    curl -sSfL "${S6_BASE}/s6-overlay-${S6_ARCH}.tar.xz" | tar -C / -Jxpf -

WORKDIR /app

# RDS CA bundle (ECS deployments use NODE_EXTRA_CA_CERTS to point here)
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/rds-bundle.pem

# ── API service ──
COPY --from=builder /repo/apps/api/dist                /app/api/
COPY --from=builder /repo/apps/api/prisma.config.ts    /app/prisma/api/prisma.config.ts
COPY --from=builder /repo/apps/api/prisma              /app/prisma/api/prisma

# ── Auth service ──
COPY --from=builder /repo/apps/auth/dist               /app/auth/
COPY --from=builder /repo/apps/auth/prisma.config.ts   /app/prisma/auth/prisma.config.ts
COPY --from=builder /repo/apps/auth/prisma             /app/prisma/auth/prisma

# ── Gateway service ──
COPY --from=builder /repo/apps/gateway/dist            /app/gateway/

# ── MCP service ──
COPY --from=builder /repo/apps/mcp/dist                /app/mcp/

# ── Console SPA ──
COPY --from=builder /repo/apps/console/build/client    /app/console/build/client
COPY --from=builder /repo/apps/console/serve.ts        /app/console/serve.ts

# s6-overlay service definitions + scripts
COPY infra/docker/s6/services/ /etc/s6-overlay/s6-rc.d/
COPY infra/docker/s6/scripts/  /etc/s6-overlay/scripts/
RUN chmod +x /etc/s6-overlay/scripts/*.sh /etc/s6-overlay/s6-rc.d/svc-*/run

# Persistent data directory (used by standalone mode for AUTH_SECRET)
ENV HEBO_DATA_DIR=/data
RUN mkdir -p ${HEBO_DATA_DIR}

ENV HEBO_MODE=standalone \
    S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2

ENTRYPOINT ["/init"]
