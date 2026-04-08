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

ARG BUN_VERSION=1
ARG S6_OVERLAY_VERSION=3.2.0.2

########################  builder — install deps + compile all apps  ########################
FROM oven/bun:${BUN_VERSION} AS builder

ARG NODE_ENV
ENV CI=1 NODE_ENV=$NODE_ENV
WORKDIR /repo
COPY . .

# Install workspace dependencies (all apps + packages)
RUN bun install --frozen-lockfile

# Build console (static assets)
RUN bun run --filter @hebo/console build

# Build backend apps (compiled standalone binaries)
RUN bun run --filter @hebo/api build && \
    bun run --filter @hebo/auth build && \
    bun run --filter @hebo/gateway build && \
    bun run --filter @hebo/mcp build

# RDS CA bundle (used by ECS deployments for Aurora TLS)
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /rds-bundle.pem

########################  runtime  ########################
FROM oven/bun:${BUN_VERSION}-slim AS runtime

ARG S6_OVERLAY_VERSION
ARG TARGETARCH

# Install s6-overlay
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${TARGETARCH}.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz && \
    tar -C / -Jxpf /tmp/s6-overlay-${TARGETARCH}.tar.xz && \
    rm -f /tmp/s6-overlay-*.tar.xz

# Install openssl for AUTH_SECRET generation + ca-certificates for TLS
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# App layout
WORKDIR /app

# RDS CA bundle (ECS deployments use NODE_EXTRA_CA_CERTS to point here)
COPY --from=builder /rds-bundle.pem /etc/ssl/certs/rds-bundle.pem

# Backend binaries
COPY --from=builder /repo/apps/api/dist/server      /app/api
COPY --from=builder /repo/apps/auth/dist/server      /app/auth
COPY --from=builder /repo/apps/gateway/dist/server   /app/gateway
COPY --from=builder /repo/apps/mcp/dist/server       /app/mcp

# Console static assets + dependencies for vite preview
COPY --from=builder /repo/apps/console/build         /app/console/build
COPY --from=builder /repo/apps/console/package.json  /app/console/package.json
COPY --from=builder /repo/apps/console/node_modules  /app/console/node_modules
COPY --from=builder /repo/apps/console/vite.config.ts /app/console/vite.config.ts

# Prisma schemas + migrations (needed for prisma migrate deploy)
COPY --from=builder /repo/apps/api/prisma            /app/prisma/api
COPY --from=builder /repo/apps/auth/prisma           /app/prisma/auth

# s6-overlay service definitions
COPY infra/docker/s6/services/ /etc/s6-overlay/s6-rc.d/

# Shared scripts (bootstrap + service runner helper)
COPY infra/docker/s6/scripts/init-hebo.sh /etc/s6-overlay/scripts/init-hebo.sh
COPY infra/docker/s6/scripts/svc-run.sh   /etc/s6-overlay/scripts/svc-run.sh
RUN chmod +x /etc/s6-overlay/scripts/*.sh /etc/s6-overlay/s6-rc.d/svc-*/run

# Persistent data directory
RUN mkdir -p /data
VOLUME /data

ENV HEBO_MODE=standalone \
    HEBO_DATA_DIR=/data \
    NODE_ENV=production \
    S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=60000

EXPOSE 8520 8521 8522 8523 8524

ENTRYPOINT ["/init"]
