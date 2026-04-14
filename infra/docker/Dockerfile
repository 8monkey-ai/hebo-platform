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

# Dependency manifests first for better Docker layer caching —
# source-only changes skip the install step entirely.
COPY --parents package.json bun.lock \
     apps/*/package.json \
     packages/*/package.json \
     ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

########################  tools  ########################
FROM debian:bookworm-slim AS tools

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl xz-utils && \
    rm -rf /var/lib/apt/lists/*

# s6-overlay
ARG TARGETARCH
RUN S6_ARCH=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "x86_64") && \
    S6_BASE="https://github.com/just-containers/s6-overlay/releases/download/v3.2.0.2" && \
    curl -sSfL "${S6_BASE}/s6-overlay-noarch.tar.xz" | tar -C / -Jxpf - && \
    curl -sSfL "${S6_BASE}/s6-overlay-${S6_ARCH}.tar.xz" | tar -C / -Jxpf -

# RDS CA bundle — fetched at build time for reproducibility
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /staged/etc/ssl/certs/rds-bundle.pem

# s6 classic layout (cont-init.d + services.d)
COPY --chmod=755 infra/docker/s6/cont-init.d/ /staged/cont-init.d/
COPY --chmod=755 infra/docker/s6/services.d/  /staged/services.d/

########################  packer  ########################
FROM scratch AS packer

# API
COPY --from=builder /repo/apps/api/dist              /app/api/
COPY --from=builder /repo/apps/api/prisma.config.ts  /app/prisma/api/prisma.config.ts
COPY --from=builder /repo/apps/api/prisma            /app/prisma/api/prisma

# Auth
COPY --from=builder /repo/apps/auth/dist             /app/auth/
COPY --from=builder /repo/apps/auth/prisma.config.ts /app/prisma/auth/prisma.config.ts
COPY --from=builder /repo/apps/auth/prisma           /app/prisma/auth/prisma

# Gateway
COPY --from=builder /repo/apps/gateway/dist          /app/gateway/

# MCP
COPY --from=builder /repo/apps/mcp/dist              /app/mcp/

# Console
COPY --from=builder /repo/apps/console/build/client  /app/console/build/client
COPY --from=builder /repo/apps/console/serve.ts      /app/console/serve.ts

# s6 scripts (classic layout)
COPY --from=tools /staged/cont-init.d/ /etc/cont-init.d/
COPY --from=tools /staged/services.d/  /etc/services.d/

# RDS CA bundle
COPY --from=tools /staged/etc/ssl/certs/rds-bundle.pem /etc/ssl/certs/rds-bundle.pem

########################  runtime  ########################
FROM oven/bun:${BUN_VERSION}-slim

# s6-overlay
COPY --from=tools /command/ /command/
COPY --from=tools /package/ /package/
COPY --from=tools /etc/s6-overlay/ /etc/s6-overlay/
COPY --from=tools /init /init

# App tree + s6 scripts + RDS cert (assembled in packer)
COPY --from=packer / /

WORKDIR /app

ENV HEBO_MODE=standalone \
    S6_KEEP_ENV=1 \
    S6_BEHAVIOUR_IF_STAGE2_FAILS=2

ENTRYPOINT ["/init"]
