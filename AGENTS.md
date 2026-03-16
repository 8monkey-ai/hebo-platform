# Repository Guidelines

## Project Structure & Module Organization

Deployable apps live in `apps/` (`auth`, `api`, `console`, `gateway`, `mcp`) while shared libraries sit in `packages/` (database, UI kits, shared data). Infrastructure code is under `infra/`. Colocate feature tests beside the implementation (`*.test.ts` / `*.spec.ts`) to keep ownership clear.

## Build, Test, and Development Commands

Install dependencies with `bun install`. Use the root scripts:

```bash
bun run dev          # Run all services with hot reload (spawns local Postgres if needed)
bun run -F @hebo/console dev   # Console-only development with MSW data
bun run build        # Workspace build across apps/packages
bun run test         # Aggregate test runner
bun run lint         # Oxlint across workspaces
bun run format       # Oxfmt formatting
```

## Coding Style & Naming Conventions

TypeScript + React drive the codebase. Trust Oxfmt and Oxlint for formatting. Use PascalCase for components, camelCase for functions and variables, and kebab-case file names (e.g., `billing-summary.tsx`). Follow the Shadcn design system inside `packages/*-ui`, and keep Tailwind utility-first unless a pattern graduates into shared UI.

## Key Technologies & Use Cases

ElysiaJS powers `apps/api` and `apps/gateway`; call helpers from `packages/shared-api` for auth, CORS, and typing. Console features run on React Router 7 (Framework mode) + Tailwind 4 (CSS) + ShadCN (Components) + Conform (Forms) + Zod v4 (Schema) + Valtio (Client State). Each service manages its own data access using Prisma (e.g., `apps/api` uses the `api` schema, `apps/auth` uses the `auth` schema). SST manages infrastructure, so declare stacks in `infra/stacks` and ship secrets with `bun run sst secret set`.

Since we are using React Compiler, don't use useMemo, useCallback, and React.memo.

## Console Frontend Patterns

### Data Loading

Use React Router `clientLoader` for data fetching — not `useEffect`. The route exports a `clientLoader` that calls the API and the component receives data via `loaderData`. This keeps loading states managed by the framework (`navigation.state`) and avoids manual `useState`/`useEffect` data-fetching boilerplate.

```tsx
// route.tsx
export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  const sp = new URL(request.url).searchParams;
  const { data } = await api.agents({ agentSlug }).branches({ branchSlug }).traces.get({ query: { ... } });
  return { traces: data?.items ?? [] };
}

export default function MyRoute({ loaderData: { traces } }: Route.ComponentProps) {
  const navigation = useNavigation();
  const loading = navigation.state !== "idle";
  return <MyList data={traces} loading={loading} />;
}
```

### Search Params as State

Use URL search params as the source of truth for filters, pagination, and presets — not component state. Create a dedicated `search-params.ts` module per feature with:
- A `parse*SearchParams(searchParams)` function for use in `clientLoader`
- A `use*SearchParams()` hook that wraps `useSearchParams` for use in components
- An `updateParams` helper that mutates the `URLSearchParams` and resets page on filter changes

### List/Detail with Nested Routes

Use React Router nested routes for list/detail views. The parent route renders the list + `<Outlet/>`, and the child route (e.g. `($traceId)`) has its own `clientLoader`. Use `shouldRevalidate` to skip re-fetching the list when only the detail selection changes (pathname change, same search params).

### Eden Type Workarounds

When Eden's treaty types don't match runtime behavior (e.g. `Date` vs ISO string serialization), use `// @ts-expect-error this works in Eden` to suppress the error. Keep these minimal and always include the explanatory comment.

## Testing Guidelines

Each workspace wires its own harness (Vitest or Bun); use the scripts rather than calling binaries directly. Add tests beside the feature (`conversation.test.ts`) and keep mocks in `__mocks__/` or MSW (`apps/console/app/mocks`). Run `bun run test` before submitting and note deliberate omissions in the PR.

## Commit & Pull Request Guidelines

Commit messages stay short and imperative (`update console mock`, `improve naming`). Keep each commit focused. Pull requests should summarize the change, list tests (`bun run test` or manual steps), link Jira/GitHub issues, and attach UI screenshots or API curl snippets when relevant. Sync cross-package API changes with the owning teams before merging.

## Environment & Secrets

Run `bun run dev` once to provision the Dockerized Postgres container, and stop it with `bun run postdev`. Clone `.env` templates from each workspace and fill only the required keys. Manage secrets via SST (`bun run sst secret set <Key> <value> --stage <stage>`) and never commit credentials.
