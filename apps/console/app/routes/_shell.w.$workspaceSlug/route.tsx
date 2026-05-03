import { Outlet, type ShouldRevalidateFunctionArgs } from "react-router";

import { ErrorView } from "~console/components/ui/ErrorView";
import { revalidateOnSuccessfulAction } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const result = await api.workspaces({ workspaceSlug: params.workspaceSlug }).get();

  if (result.error?.status === 404)
    throw new Response(`Workspace '${params.workspaceSlug}' does not exist`, {
      status: 404,
      statusText: "Not Found",
    });

  return { workspace: result.data! };
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  if (args.currentParams.workspaceSlug !== args.nextParams.workspaceSlug) {
    return true;
  }
  return revalidateOnSuccessfulAction(args);
}

export default function WorkspaceLayout() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-6">
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorView />;
}
