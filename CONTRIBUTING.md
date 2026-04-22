# Contributing to Hebo

## Repository Structure

```
/ (hebo)
├── apps/                           # Deployable applications
│   ├── api/                        # REST API server (ElysiaJS)
│   ├── auth/                       # Auth Service (ElysiaJS + Better Auth)
│   ├── console/                    # Web console (React Router + Vite)
│   ├── gateway/                    # AI Gateway (ElysiaJS + Hebo AI Gateway)
│   └── mcp/                        # MCP Server (ElysiaJS)
│
├── packages/                       # Shared libraries and utilities
│   ├── aikit-ui/                   # Chat UI components (Shadcn + custom)
│   ├── shared-api/                 # API utilities (auth, CORS)
│   ├── shared-data/                # Shared data models & schemas
│   └── shared-ui/                  # UI components (Shadcn + custom)
│
├── infra/                          # Infrastructure
│   ├── dev/                        # Docker Compose for local development (Postgres, GreptimeDB)
│   ├── docker/                     # Dockerfile + s6-overlay service definitions
│   ├── self-hosted/                # Docker Compose + env template for self-hosted deployments
│   └── stacks/                     # SST stacks (AWS ECS deployments)
│
├── .github/
│   └── workflows/                  # CI/CD pipelines
│
├── bunfig.toml                     # Bun configuration
├── lefthook.yml                    # Git hooks configuration
├── sst.config.ts                   # SST configuration
├── tsconfig.base.json              # Base TypeScript configuration
├── .oxlintrc.json                  # Oxlint configuration
└── .oxfmtrc.json                   # Oxfmt configuration
```

## Prerequisites

- Bun >= 1.3.12
- Docker >= 28
- AWS CLI (only required for deployment)

We recommend to use [mise](https://mise.jdx.dev) to manage your bun version if you work on multiple projects in parallel.

## Installation

```bash
bun install
```

## Development

### Quick start

```bash
# 1) Start local infrastructure (Docker Compose)
bun run dev:infra:up

# 2) Apply migrations
bun run db:migrate

# 3) Run all apps (API, Gateway, Console)
bun run dev

# Optional - console only with service mocks
bun run -F @hebo/console dev
```

### Environment variables

Each app manages its own environment (e.g. `.env`, `.env.local`). Create a `.env` inside the app directory if you need to override defaults.

```bash
cd apps/console
cp .env.example .env
```

### Database

```bash
# Start local infrastructure
bun run dev:infra:up

# Stop local infrastructure
bun run dev:infra:down

# Migrate
bun run db:migrate

# Reset (drops data)
bun run db:reset
```

### Cleanup

```bash
bun run clean
```

## Secrets (local and remote)

Code reads values via `getSecret(name)` (see `packages/shared-api/utils/secret.ts`), which resolves in order:

1. **SST Resource** — used in ECS deployments
2. **Bun secrets** — `bun run secret set <name> <value>`, used in local development
3. **Environment variable** — same name used directly (e.g. `ANTHROPIC_API_KEY`), used in self-hosted/Docker deployments

Local development secrets are optional. Only configure the ones needed for the features you're working with (e.g., configure LLM provider secrets to test AI features).

Secret names:

- Auth
  - GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Microsoft: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`
  - Email OTP and Magic Link: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  - BetterAuth: `AUTH_SECRET` (https://www.better-auth.com/docs/reference/options#secret))

- LLMs
  - Bedrock: `BEDROCK_ROLE_ARN`, `BEDROCK_REGION`
  - Vertex: `VERTEX_SERVICE_ACCOUNT_EMAIL`, `VERTEX_AWS_PROVIDER_AUDIENCE`, `VERTEX_PROJECT`, `VERTEX_LOCATION`
  - Anthropic: `ANTHROPIC_API_KEY`
  - OpenAI: `OPENAI_API_KEY`
  - DeepSeek: `DEEPSEEK_API_KEY`
  - xAI: `XAI_API_KEY`
  - Alibaba (Qwen): `QWEN_API_KEY`
  - MiniMax: `MINIMAX_API_KEY`
  - Z.ai (Zhipu): `ZHIPU_API_KEY`
  - Moonshot: `MOONSHOT_API_KEY`
  - Fireworks: `FIREWORKS_API_KEY`
  - DeepInfra: `DEEPINFRA_API_KEY`
  - Together AI: `TOGETHERAI_API_KEY`
  - Chutes: `CHUTES_API_KEY`
  - Others: `VOYAGE_API_KEY`, `GROQ_API_KEY`

- BYOK (Bring Your Own Key)
  - `ENFORCE_BYOK`: when set, non-free models require org-level provider credentials
  - `FREE_MODEL_IDS`: comma-separated list of model IDs that are free (bypass BYOK enforcement)

- Observability / traces
  - Greptime: `GREPTIME_HOST` (hostname only, e.g. `my-greptimedb.example.com`)

Note for local development: if SMTP secrets are not configured, the email OTP is logged to the console (look for `>>> OTP:`) so you can sign in without setting up an email provider.

Local (Bun) examples:

```bash
# set / get / delete
bun run secret set GITHUB_CLIENT_ID <value>
bun run secret get GITHUB_CLIENT_ID
bun run secret delete GITHUB_CLIENT_ID
```

Remote (SST) examples:

```bash
# set / remove (choose your <stage>)
bun run sst secret set GITHUB_CLIENT_ID <value> --stage <stage>
bun run sst secret remove GITHUB_CLIENT_ID --stage <stage>
```

## Run modes

| #   | Mode                        | Command                                            | Database              | Notes                          |
| --- | --------------------------- | -------------------------------------------------- | --------------------- | ------------------------------ |
| 1   | **Frontend-only** (offline) | `bun run -F @hebo/console dev`                     | —                     | UI relies on mock services     |
| 2   | **Local full-stack**        | `bun run dev`                                      | Dockerized PostgreSQL | All apps with hot reload       |
| 3   | **Self-hosted**             | `docker compose up -d` (from `infra/self-hosted/`) | Dockerized PostgreSQL | Single container, all services |
| 4   | **Cloud (ECS)**             | `bun run sst deploy`                               | Aurora PostgreSQL     | HTTPS URLs exported by SST     |

## Self-hosted

A single Docker image (`8monkey/hebo-platform`) packages all services for self-hosted deployments. The image uses [s6-overlay](https://github.com/just-containers/s6-overlay) to run API, Auth, Console, Gateway, and MCP inside one container. Configuration and compose files live in `infra/self-hosted/`. The same image is also used for cloud ECS deployments in single-role mode via the `HEBO_MODE` env var (`api`, `auth`, `gateway`, `mcp`).

## Building

```bash
# Build all packages and apps
bun run build

# Build specific package/console
bun run -F @hebo/console build
```

## Testing

```bash
# Run all tests
bun run test

# Test specific package/console
bun run -F @hebo/console test
```

## Deployment

### Self-hosted Docker image

The Docker image is built from `infra/docker/Dockerfile` and published to Docker Hub via the `publish-image.yml` workflow:

- **Release** — pushing a `v*` tag builds with `NODE_ENV=production` and tags the image as `v<semver>`
- **Manual** — trigger the workflow manually for development builds

### Cloud (AWS ECS)

The repository uses GitHub Actions for CI/CD with SST managing the infrastructure:

- Push a `v*` tag to trigger a production deployment
- Add the `preview deploy` label to a PR to deploy a preview environment

#### Service URLs

- API: `https://api.hebo.ai` (prod) or `https://api.<stage>.hebo.ai` (preview)
- Auth: `https://auth.hebo.ai` (prod) or `https://auth.<stage>.hebo.ai` (preview)
- Gateway: `https://gateway.hebo.ai` (prod) or `https://gateway.<stage>.hebo.ai` (preview)
- Console: `https://console.hebo.ai` (prod) or `https://console.<stage>.hebo.ai` (preview)
- MCP: `https://mcp.hebo.ai` (prod) or `https://mcp.<stage>.hebo.ai` (preview)

#### Manual deployments

For deployments, we utilize the SST framework ([sst.dev](https://sst.dev/)).

```bash
# Install providers
bun run sst install

# Deploy a preview link
bun run sst deploy --stage PR-XX

# Remove a preview link
bun run sst remove --stage PR-XX

# Deploy to production
bun run sst deploy --stage production
```
