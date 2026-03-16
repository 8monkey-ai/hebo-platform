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

### Tailwind Classes

Minimise Tailwind classes. Avoid duplicating utilities already present on a parent component. Prefer fewer, well-chosen classes over verbose class lists.

### DOM Hierarchy

Keep the DOM flat. Minimise nested `<div>` wrappers — flatten the hierarchy as much as possible to reduce complexity and improve readability.

### Forms with Conform

Always wrap Conform-powered forms in `FormControl` (from `@hebo/shared-ui/components/Field`) rather than a plain `<form>`. `FormControl` provides the required `FormProvider` context that `Field`, `FieldLabel`, `FieldControl`, and `FieldError` depend on. Use `as={Form}` for React Router actions or `as={fetcher.Form}` for fetcher-based submissions.

```tsx
<FormControl form={form} as={Form}>
  <input type="hidden" name="intent" value="create" />
  <Field name={fields.email.name}>
    <FieldLabel>Email</FieldLabel>
    <FieldControl><Input /></FieldControl>
    <FieldError />
  </Field>
  <Button type="submit" isLoading={navigation.state !== "idle"}>Submit</Button>
</FormControl>
```

### Multiple Actions in One Route

Use an `intent` hidden input to route multiple form submissions through a single `clientAction`. For primary forms (invite, create) use `Form` + `useNavigation`; for inline row actions (delete, revoke) use `useFetcher` so they don't affect the page navigation state.

```tsx
// clientAction
const intent = formData.get("intent");
if (intent === "invite") { ... return { intent, submission: submission.reply() }; }
if (intent === "remove") { ... return null; }
// fall through to default action
```

```tsx
// Inline fetcher button
function RemoveButton({ id }: { id: string }) {
  const fetcher = useFetcher();
  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="remove" />
      <input type="hidden" name="id" value={id} />
      <Button type="submit" isLoading={fetcher.state !== "idle"}>Remove</Button>
    </fetcher.Form>
  );
}
```

### Resource Routes for Section Actions

For pages with multiple independent sections (e.g. settings), give each section its own resource route for actions while the page route keeps a single `clientLoader`. Resource routes are child routes with only a `clientAction` export and no default component.

Section components use `useFetcher` with an explicit relative `action` so submissions go to the resource route without navigating away. Fetcher data is used for `lastResult` instead of `useActionData`. A redirect returned from a resource route action still navigates the page.

```
routes/
  _shell.agent.$agentSlug.settings/route.tsx          ← clientLoader + page component
  _shell.agent.$agentSlug.settings.members/route.tsx  ← clientAction only (invite/remove/revoke)
  _shell.agent.$agentSlug.settings.danger/route.tsx   ← clientAction only (agent delete)
```

```tsx
// resource route — no default export
export async function clientAction({ request, params }) { ... }

// section component
const fetcher = useFetcher<{ intent: string; submission: any }>();
const [form, fields] = useForm({
  lastResult: fetcher.state === "idle" ? fetcher.data?.submission : undefined,
});
<FormControl form={form} as={fetcher.Form} action="members">...</FormControl>
```

### ShadCN Components

Use existing ShadCN components from `packages/shared-ui` where applicable. If a needed component doesn't exist yet, add it to the project using the `shadcn` CLI before building a custom one.

## Technical Design Priorities

1. Simple, clean, concise, and easy-to-read / maintain code.
2. Modular and tree-shakable architecture with clear separation of concerns.
3. Prefer clarity by default, but accept targeted complexity in hot paths when performance gains are measurable.
4. Prefer Bun compiler/runtime optimizations over unnecessary manual micro-optimizations or boilerplate.
5. Runtime-agnostic behavior across Bun, Deno, Node.js, Cloudflare Workers, Vercel, and AWS Lambda.

If priorities conflict, apply this order:

1. Public API compatibility
2. Runtime portability
3. Readability and style consistency
4. Hot-path performance

## Hot Path Rules

- Minimize per-request allocations and repeated transformations in middleware/converter/handler paths.
- Avoid extra abstraction layers in latency-sensitive code when they do not improve maintainability.
- Keep branches and data-shape conversions explicit in hot paths for predictable performance.

## Testing Guidelines

Each workspace wires its own harness (Vitest or Bun); use the scripts rather than calling binaries directly. Add tests beside the feature (`conversation.test.ts`) and keep mocks in `__mocks__/` or MSW (`apps/console/app/mocks`). Run `bun run test` before submitting and note deliberate omissions in the PR.

## Keeping These Guidelines Current

After implementing any feature or fixing a non-trivial bug, update this file if the work produced a reusable architectural pattern, a technical design decision, or a coding guideline others should follow. Add it under the most relevant section, or create a new section if needed. Keep entries concise and include a minimal code example where it aids clarity.

## Commit & Pull Request Guidelines

Commit messages stay short and imperative (`update console mock`, `improve naming`). Keep each commit focused. Pull requests should summarize the change, list tests (`bun run test` or manual steps), link Jira/GitHub issues, and attach UI screenshots or API curl snippets when relevant. Sync cross-package API changes with the owning teams before merging.

## PR/Commit Checklist

- [ ] Change is scoped to requested behavior.
- [ ] Types compile (`bun run typecheck`).
- [ ] Tests pass (`bun run test`) or failures are documented.

## Environment & Secrets

Run `bun run dev` once to provision the Dockerized Postgres container, and stop it with `bun run postdev`. Clone `.env` templates from each workspace and fill only the required keys. Manage secrets via SST (`bun run sst secret set <Key> <value> --stage <stage>`) and never commit credentials.
