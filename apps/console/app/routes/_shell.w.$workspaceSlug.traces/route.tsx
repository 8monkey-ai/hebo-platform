import { Outlet, useNavigation, useParams } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";

import { cn } from "@hebo/shared-ui/lib/utils";

import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { TraceList } from "./list";
import { parseTraceSearchParams } from "./search-params";

export async function clientLoader({
  params: { workspaceSlug },
  request,
}: Route.ClientLoaderArgs) {
  const { effectiveFrom, effectiveTo, metadata, status, operation, page } = parseTraceSearchParams(
    new URL(request.url).searchParams,
  );

  const listResult = await api.traces.get({
    query: {
      workspace: workspaceSlug,
      page: page,
      from: effectiveFrom,
      to: effectiveTo,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      status,
      operation,
    },
  });

  return {
    traces: listResult.data?.data ?? [],
    hasNextPage: listResult.data?.hasNextPage ?? false,
    metadataKeys: listResult.data?.metadataKeys ?? [],
    page,
  };
}

export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (currentUrl.pathname !== nextUrl.pathname && currentUrl.search === nextUrl.search) {
    return false;
  }
  return defaultShouldRevalidate;
}

export default function TracesRoute({
  loaderData: { traces, hasNextPage, metadataKeys, page },
}: Route.ComponentProps) {
  const navigation = useNavigation();
  const { traceId } = useParams();

  const isListLoading =
    navigation.state !== "idle" && navigation.location?.pathname === location.pathname;

  return (
    <div className="h-full min-h-0 flex-1 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 @2xl:grid-cols-[minmax(324px,4fr)_minmax(0,7fr)]">
        <div
          className={cn(
            "relative flex h-full min-h-0 flex-col rounded-lg border bg-card pt-4 pb-2",
            traceId && "hidden @2xl:flex",
          )}
        >
          <TraceList
            traces={traces}
            hasNextPage={hasNextPage}
            page={page}
            metadataKeys={metadataKeys}
            loading={isListLoading}
            selectedTraceId={traceId ?? null}
          />
        </div>

        <div className={cn("h-full min-h-0", traceId ? "block" : "hidden @2xl:block")}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
