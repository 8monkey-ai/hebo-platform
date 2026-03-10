import { Suspense, useState } from "react";
import { Await, useNavigate, useParams, useSearchParams } from "react-router";

import { TableSkeleton } from "@hebo/shared-ui/components/Skeleton";

import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { MetadataFilterBar } from "./metadata-filter";
import { TimeRangeSelector } from "./time-range";
import { TraceDetailPanel } from "./trace-detail";
import { TraceList, TracePagination } from "./trace-list";

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const timeRange = url.searchParams.get("timeRange") ?? undefined;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

  // Collect meta.* params for metadata filtering
  const query: Record<string, string> = {};
  if (timeRange) query.timeRange = timeRange;
  if (from) query.from = from;
  if (to) query.to = to;
  query.page = String(page);
  query.pageSize = String(pageSize);

  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith("meta.")) {
      query[key] = value;
    }
  }

  const traces = api
    .agents({ agentSlug: params.agentSlug })
    .branches({ branchSlug: params.branchSlug })
    .traces.get({ query: query as any });

  const metadataKeys = api
    .agents({ agentSlug: params.agentSlug })
    .branches({ branchSlug: params.branchSlug })
    .traces["metadata-keys"].get({
      query: { timeRange: timeRange ?? "1h", from, to } as any,
    });

  return { traces, metadataKeys };
}

export default function TracesRoute({ loaderData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routeParams = useParams();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Parse current state from URL
  const currentTimeRange = searchParams.get("timeRange") ?? "1h";
  const currentFrom = searchParams.get("from") ?? undefined;
  const currentTo = searchParams.get("to") ?? undefined;
  const currentPage = Number(searchParams.get("page") ?? "1");

  // Parse metadata filters from URL
  const metadataFilters: { key: string; value: string }[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      metadataFilters.push({ key: key.slice(5), value });
    }
  }

  const timeRangeValue =
    currentFrom && currentTo
      ? ({ type: "custom" as const, from: currentFrom, to: currentTo })
      : ({ type: "preset" as const, preset: currentTimeRange });

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleTimeRangeChange = (value: { type: string; preset?: string; from?: string; to?: string }) => {
    if (value.type === "preset") {
      updateSearchParams({
        timeRange: value.preset,
        from: undefined,
        to: undefined,
        page: "1",
      });
    } else {
      updateSearchParams({
        timeRange: undefined,
        from: value.from,
        to: value.to,
        page: "1",
      });
    }
  };

  const handleRefresh = () => {
    navigate(`?${searchParams.toString()}`, { replace: true });
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page: String(page) });
  };

  const handleMetadataChange = (filters: { key: string; value: string }[]) => {
    const params = new URLSearchParams(searchParams);
    // Remove all existing meta.* params
    for (const key of [...params.keys()]) {
      if (key.startsWith("meta.")) {
        params.delete(key);
      }
    }
    // Add new ones
    for (const { key, value } of filters) {
      params.set(`meta.${key}`, value);
    }
    params.set("page", "1");
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleSelectTrace = async (traceId: string) => {
    if (selectedTraceId === traceId) {
      setSelectedTraceId(null);
      setTraceDetail(null);
      return;
    }

    setSelectedTraceId(traceId);
    setLoadingDetail(true);

    try {
      const agentSlug = routeParams.agentSlug ?? "";
      const branchSlug = routeParams.branchSlug ?? "";

      const result = await api
        .agents({ agentSlug })
        .branches({ branchSlug })
        .traces({ traceId })
        .get();

      setTraceDetail(result.data);
    } catch {
      setTraceDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Traces</h1>
        <p className="text-sm text-muted-foreground">
          Inspect recent gen_ai executions for this branch.
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <TimeRangeSelector
          value={timeRangeValue}
          onChange={handleTimeRangeChange}
          onRefresh={handleRefresh}
        />

        <Suspense fallback={null}>
          <Await resolve={loaderData.metadataKeys}>
            {(result) => (
              <MetadataFilterBar
                filters={metadataFilters}
                onChange={handleMetadataChange}
                suggestedKeys={(result as any)?.data ?? []}
              />
            )}
          </Await>
        </Suspense>
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-0 lg:grid ${selectedTraceId ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        {/* Trace list */}
        <div className="min-w-0">
          <Suspense fallback={<TableSkeleton />}>
            <Await resolve={loaderData.traces}>
              {(result) => {
                const data = (result as any)?.data;
                if ((result as any)?.error) {
                  return (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/50 p-8 text-center">
                      <p className="text-sm text-destructive">Failed to load traces</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {String((result as any).error?.value ?? "An error occurred")}
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <TraceList
                      traces={data?.data ?? []}
                      selectedTraceId={selectedTraceId ?? undefined}
                      onSelect={handleSelectTrace}
                    />
                    <TracePagination
                      page={data?.page ?? currentPage}
                      pageSize={data?.pageSize ?? 50}
                      total={data?.total ?? 0}
                      onPageChange={handlePageChange}
                    />
                  </>
                );
              }}
            </Await>
          </Suspense>
        </div>

        {/* Detail panel */}
        {selectedTraceId && (
          <div className="min-h-[400px] lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
            {loadingDetail ? (
              <div className="flex items-center justify-center p-8">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : traceDetail ? (
              <TraceDetailPanel
                trace={traceDetail}
                onClose={() => {
                  setSelectedTraceId(null);
                  setTraceDetail(null);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground">Trace not found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
