# Hebo

This is the monorepo for Hebo, containing all our applications and shared packages.

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
├── infra/                          # Infrastructure as Code (SST)
│   └── stacks/                     # SST stacks
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

- Bun >= 1.3.8
- Docker >= 28
- AWS CLI (only required for deployment)

We recommend to use [mise](https://mise.jdx.dev) to manage your bun version if you work on multiple projects in parallel.

## Installation

```bash
# Install dependencies
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

- Each app manages its own environment (e.g. `.env`, `.env.local`). Create a `.env` inside the app directory if you need to override defaults.

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

We use Bun secrets for local development and SST secrets for remote deployments. Code reads values via `getSecret(name)` (see `packages/shared-api/utils/secrets.ts`), which resolves from SST first and falls back to Bun secrets locally.

Local development secrets are optional. Only configure the ones needed for the features you're working with (e.g., configure LLM provider secrets to test AI features).

Secret names:

- Auth
  - GitHub: `GithubClientId`, `GithubClientSecret`
  - Google: `GoogleClientId`, `GoogleClientSecret`
  - Microsoft: `MicrosoftClientId`, `MicrosoftClientSecret`
  - Email OTP and Magic Link: `SmtpHost`, `SmtpPort`, `SmtpUser`, `SmtpPass`, `SmtpFrom`
  - BetterAuth: `AuthSecret` (https://www.better-auth.com/docs/reference/options#secret))

- LLMs
  - Bedrock: `BedrockRoleArn`, `BedrockRegion`
  - Vertex: `VertexServiceAccountEmail`, `VertexAwsProviderAudience`, `VertexProject`, `VertexLocation`
  - Anthropic: `AnthropicApiKey`
  - OpenAI: `OpenaiApiKey`
  - Others: `VoyageApiKey`, `GroqApiKey`

- BYOK (Bring Your Own Key)
  - `EnforceByok`: when set, non-free models require org-level provider credentials
  - `FreeModelIds`: comma-separated list of model IDs that are free (bypass BYOK enforcement)

- Observability / traces
  - Greptime: `GreptimeHost` (hostname only, e.g. `my-greptimedb.example.com`)

Note for local development: if SMTP secrets are not configured, the email OTP is logged to the console (look for `>>> OTP:`) so you can sign in without setting up an email provider.

Local (Bun) examples:

```bash
# set / get / delete
bun run secret set GithubClientId <value>
bun run secret get GithubClientId
bun run secret delete GithubClientId
```

Remote (SST) examples:

```bash
# set / remove (choose your <stage>)
bun run sst secret set GithubClientId <value> --stage <stage>
bun run sst secret remove GithubClientId --stage <stage>
```

## Run modes

| #   | Mode                        | Command                        | Database              | API availability                  |
| --- | --------------------------- | ------------------------------ | --------------------- | --------------------------------- |
| 1   | **Frontend-only** (offline) | `bun run -F @hebo/console dev` | —                     | none – UI relies on mock services |
| 2   | **Local full-stack**        | `bun run dev`                  | Dockerized PostgreSQL | URLs from env                     |
| 3   | **Remote full-stack**       | `bun run sst deploy`           | Aurora PostgreSQL     | HTTPS URLs exported by SST        |

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

## Self-Hosted Deployment

Run Hebo on your own infrastructure with a single Docker Compose command:

```bash
docker compose -f infra/self-hosted/docker-compose.self-hosted.yml up
```

This starts three containers: `hebo` (all services + console), `postgres`, and `greptimedb`.

All infrastructure configuration (database, auth, metrics) works out of the box with sensible defaults — no environment variables required. To enable chat, provide at least one LLM provider key:

```bash
GROQ_API_KEY=gsk_... docker compose -f infra/self-hosted/docker-compose.self-hosted.yml up -d
```

[Groq's free tier](https://console.groq.com/) is the quickest way to get started. You can also pass multiple provider keys at once (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).

The console is available at `http://localhost` once all services are ready.

### Environment Variables

Infrastructure variables have zero-config defaults. Provider and OAuth variables can be passed to the `hebo` service via shell environment or a `.env` file next to the compose file:

| Variable | Default | Purpose |
|---|---|---|
| `AUTH_SECRET` | Auto-generated, persisted to `/data/.auth_secret` | Session signing key |
| `DATABASE_URL` | `postgresql://postgres:password@postgres:5432/hebo` | PostgreSQL connection string |
| `GREPTIME_HOST` | `greptimedb` | GreptimeDB hostname for observability |
| `AUTH_URL` | `http://localhost:3000` | Set to `https://<your-domain>/auth` when using OAuth on a public domain |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Google OAuth |
| `GROQ_API_KEY` | — | Groq provider (free tier available) |
| `OPENAI_API_KEY` | — | OpenAI provider |
| `ANTHROPIC_API_KEY` | — | Anthropic provider |
| `AZURE_OPENAI_API_KEY` | — | Azure OpenAI provider |
| `AZURE_OPENAI_RESOURCE_NAME` | — | Azure OpenAI resource name |

### HTTPS with Caddy

For production deployments on a public domain, use [Caddy](https://caddyserver.com/) as a reverse proxy for automatic HTTPS via Let's Encrypt.

Create a `Caddyfile` on your host:

```caddyfile
hebo.example.com {
    reverse_proxy localhost:80
}
```

Then run Caddy alongside the compose stack:

```bash
caddy run --config Caddyfile
```

Caddy automatically provisions and renews TLS certificates. When using OAuth on a public domain, set `AUTH_URL=https://hebo.example.com/auth` so that better-auth generates correct callback URLs.

[Traefik](https://traefik.io/) and [Nginx](https://nginx.org/) are viable alternatives — refer to their respective documentation for TLS configuration.

## Cloud Deployment

The repository uses GitHub Actions for CI/CD:

- Push a new tag to trigger the deployment

### Service URLs

- API: `https://api.hebo.ai` (prod) or `https://api.<stage>.hebo.ai` (preview)
- Auth: `https://auth.hebo.ai` (prod) or `https://auth.<stage>.hebo.ai` (preview)
- Gateway: `https://gateway.hebo.ai` (prod) or `https://gateway.<stage>.hebo.ai` (preview)
- Console: `https://console.hebo.ai` (prod) or `https://console.<stage>.hebo.ai` (preview)
- MCP: `https://mcp.hebo.ai` (prod) or `https://mcp.<stage>.hebo.ai` (preview)

### Manual deployments

For deployments, we utilize the SST framework ([sst.dev](https://sst.dev/)).

#### Launch and Clean up

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
