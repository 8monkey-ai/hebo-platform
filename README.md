# Hebo

This is the monorepo for Hebo, containing all our applications and shared packages.

## Repository Structure

```
/ (hebo)
├── apps/                           # Deployable applications
│   ├── api/                        # REST API server (ElysiaJS)
│   ├── auth/                       # Auth Service (ElysiaJS + Better Auth)
│   ├── console/                    # Web console (React Router + Vite)
│   ├── gateway/                    # AI Gateway (ElysiaJS + Vercel AI SDK)
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
├── eslint.config.mjs               # ESLint configuration
├── sst.config.ts                   # SST configuration
├── tsconfig.base.json              # Base TypeScript configuration
└── turbo.json                      # Turborepo configuration
```

## Prerequisites

- Bun >= 1.3.6
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

# Optional - console only (from repo root)
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

We use Bun secrets for local development and SST secrets for remote deployments. Code reads values via `getSecret(name)` (see `packages/shared-api/utils/get-secret.ts`), which resolves from SST first and falls back to Bun secrets locally.

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
  - Others: `VoyageApiKey`, `GroqApiKey`

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

| #   | Mode                         | Command                          | Database              | API availability                        |
|-----|------------------------------|----------------------------------|-----------------------|-----------------------------------------|
| 1   | **Frontend-only** (offline)  | `bun run -F @hebo/console dev`   | —                     | none – UI relies on MSW / MSW data      |
| 2   | **Local full-stack**         | `bun run dev`                    | Dockerized PostgreSQL | URLs from env                           |
| 3   | **Remote full-stack**        | `bun run sst deploy`             | Aurora PostgreSQL     | HTTPS URLs exported by SST              |

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
