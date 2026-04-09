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

########################  builder — install deps + compile all apps  ########################
FROM oven/bun:${BUN_VERSION} AS builder

ARG NODE_ENV
ENV CI=1 NODE_ENV=$NODE_ENV
WORKDIR /repo
COPY . .

# Install workspace dependencies (all apps + packages)
RUN bun install --frozen-lockfile

# Build all apps (console static assets + backend standalone binaries)
RUN bun run build

########################  runtime  ########################
FROM oven/bun:${BUN_VERSION}-slim AS runtime

# Install openssl for AUTH_SECRET generation + ca-certificates and curl for downloads
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates curl xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Install s6-overlay (s6 uses aarch64 instead of Docker's arm64)
ARG TARGETARCH
RUN S6_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "$TARGETARCH") && \
    S6_BASE="https://github.com/just-containers/s6-overlay/releases/download/v3.2.0.2" && \
    curl -sSfL "${S6_BASE}/s6-overlay-noarch.tar.xz" | tar -C / -Jxpf - && \
    curl -sSfL "${S6_BASE}/s6-overlay-${S6_ARCH}.tar.xz" | tar -C / -Jxpf -

# Create non-root user for running services
RUN groupadd -r hebo && useradd -r -g hebo hebo

# App layout
WORKDIR /app

# RDS CA bundle (ECS deployments use NODE_EXTRA_CA_CERTS to point here)
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/rds-bundle.pem

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
COPY infra/docker/s6/scripts/ /etc/s6-overlay/scripts/
RUN chmod +x /etc/s6-overlay/scripts/*.sh /etc/s6-overlay/s6-rc.d/svc-*/run

# Persistent data directory
RUN mkdir -p /data

ENV HEBO_MODE=standalone \
    HEBO_DATA_DIR=/data \
    NODE_ENV=production \
    S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2 \
    S6_CMD_WAIT_FOR_SERVICES_MAXTIME=60000

ENTRYPOINT ["/init"]
