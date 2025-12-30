import { Outlet, type ShouldRevalidateFunctionArgs } from "react-router";

import { ErrorView } from "~console/components/ui/ErrorView";
import { api } from "~console/lib/service";
import { dontRevalidateOnFormErrors } from "~console/lib/errors";

import type { Route } from "./+types/route";


export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const result = await api
    .agents({ agentSlug: params.agentSlug })
    .get({ query: { branches: true } });

  if (result.error?.status === 404)
    throw new Response(`Agent '${params.agentSlug}' does not exist`, {
      status: 404, statusText: "Not Found"
    });

  const agent = result.data!

  let branch = undefined;
  if (params.branchSlug) {
    branch = agent.branches?.find((a) => a.slug === params.branchSlug);

    if (branch === undefined) 
      throw new Response(`Branch '${params.branchSlug}' does not exist`, {
        status: 404, statusText: "Not Found"
      })
  }

  return { agent, branch };
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  if (args.currentParams.agentSlug !== args.nextParams.agentSlug
    || args.currentParams.branchSlug !== args.nextParams.branchSlug ) {
    return true;
  }
  return dontRevalidateOnFormErrors(args);
}


export default function AgentLayout() {
  return <div className="mx-auto max-w-2xl min-w-0 w-full flex flex-col gap-6"><Outlet /></div>;
}

export function ErrorBoundary () {
  return <ErrorView />;
};
