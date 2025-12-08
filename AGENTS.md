# Repository Guidelines

## Project Structure & Module Organization
Deployable apps live in `apps/` (`api`, `console`, `gateway`, `mcp`) while shared libraries sit in `packages/` (database, UI kits, shared data). Infrastructure code is under `infra/`. Colocate feature tests beside the implementation (`*.test.ts` / `*.spec.ts`) to keep ownership clear.

## Build, Test, and Development Commands
Install dependencies with `bun install`. Use the Turborepo scripts from the root:

```bash
bun run dev          # Run all services with hot reload (spawns local Postgres if needed)
bun run -F @hebo/console dev   # Console-only development with MSW data
bun run build        # Turborepo build across workspaces
bun run test         # Aggregate test runner
bun run lint         # ESLint across workspaces
bun run format       # Prettier formatting
```

## Coding Style & Naming Conventions
TypeScript + React drive the codebase. Trust Prettier and ESLint for formatting. Use PascalCase for components, camelCase for functions and variables, and kebab-case file names (e.g., `billing-summary.tsx`). Follow the Shadcn design system inside `packages/*-ui`, and keep Tailwind utility-first unless a pattern graduates into shared UI.

## Key Technologies & Use Cases
ElysiaJS powers `apps/api` and `apps/gateway`; call helpers from `packages/shared-api` for auth, CORS, and typing. Console features run on React Router 7 (Framework mode) + Tailwind 4 (CSS) + ShadCN (Components) + Conform (Forms) + Zod v4 (Schema) + Valtio (Client State). Data access flows through `packages/database` (Prisma). SST manages infrastructure, so declare stacks in `infra/stacks` and ship secrets with `bun run sst secret set`.

Since we are using React Compiler, don't use useMemo, useCallback, and React.memo.

## Testing Guidelines
Each workspace wires its own harness (Vitest or Bun); use the scripts rather than calling binaries directly. Add tests beside the feature (`conversation.test.ts`) and keep mocks in `__mocks__/` or MSW (`apps/console/app/mocks`). Run `bun run test` before submitting and note deliberate omissions in the PR.

## Commit & Pull Request Guidelines
Commit messages stay short and imperative (`update console mock`, `improve naming`). Keep each commit focused. Pull requests should summarize the change, list tests (`bun run test` or manual steps), link Jira/GitHub issues, and attach UI screenshots or API curl snippets when relevant. Sync cross-package API changes with the owning teams before merging.

## Environment & Secrets
Run `bun run dev` once to provision the Dockerized Postgres container, and stop it with `bun run postdev`. Clone `.env` templates from each workspace and fill only the required keys. Manage secrets via SST (`bun run sst secret set <Key> <value> --stage <stage>`) and never commit credentials.
