import { Outlet, useLocation, useNavigate, useNavigation, useParams } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";

import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { TraceList } from "./list";
import { parseTraceSearchParams } from "./search-params";

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

export async function clientLoader({
  params: { agentSlug, branchSlug },
  request,
}: Route.ClientLoaderArgs) {
  const sp = new URL(request.url).searchParams;
  const { effectiveFrom, effectiveTo, metadata } = parseTraceSearchParams(sp);
  const page = Number(sp.get("page") ?? 1);

  const listResult = await api
    .agents({ agentSlug })
    .branches({ branchSlug })
    .traces.get({
      query: {
        page: page,
        // @ts-expect-error this works in Eden
        from: effectiveFrom,
        // @ts-expect-error this works in Eden
        to: effectiveTo,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
      },
    });

  return {
    traces: listResult.data?.data ?? [],
    hasNextPage: listResult.data?.hasNextPage ?? false,
    metadataKeys: listResult.data?.metadataKeys ?? [],
    page,
  };
}

export default function TracesRoute({
  loaderData: { traces, hasNextPage, metadataKeys, page },
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();

  const { spanId } = useParams();

  return (
    <div className="h-full min-h-0 flex-1 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 @2xl:grid-cols-[minmax(324px,4fr)_minmax(0,7fr)]">
        <div
          className={`relative flex h-full min-h-0 flex-col rounded-lg border bg-card pt-4 pb-2 ${
            spanId ? "hidden @2xl:flex" : ""
          }`}
        >
          <TraceList
            traces={traces}
            hasNextPage={hasNextPage}
            page={page}
            metadataKeys={metadataKeys}
            loading={navigation.state !== "idle"}
            selectedSpanId={spanId ?? null}
            onSelectSpan={(id) => navigate({ pathname: id, search: location.search })}
          />
        </div>

        <div className={`h-full min-h-0 ${spanId ? "block" : "hidden @2xl:block"}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
