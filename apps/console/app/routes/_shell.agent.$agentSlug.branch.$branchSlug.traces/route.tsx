import { Suspense, useState } from "react";
import { Await, useNavigate, useParams, useSearchParams } from "react-router";

import { TableSkeleton } from "@hebo/shared-ui/components/Skeleton";

import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { MetadataFilterBar } from "./metadata-filter";
import { TimeRangeSelector } from "./time-range";
import { TraceDetailPanel } from "./trace-detail";
import { TraceList } from "./trace-list";

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  if (!query.timeRange && !query.from) {
    query.timeRange = "1h";
  }

  const traces = api
    .agents({ agentSlug: params.agentSlug })
    .branches({ branchSlug: params.branchSlug })
    .traces.get({ query: query as any });

  let metadataKeys: string[] = [];
  try {
    const keysResult = await api
      .agents({ agentSlug: params.agentSlug })
      .branches({ branchSlug: params.branchSlug })
      .traces["metadata-keys"].get({
        query: {
          timeRange: query.timeRange,
          from: query.from,
          to: query.to,
        },
      });
    metadataKeys = Array.isArray(keysResult.data) ? keysResult.data : [];
  } catch {
    // Metadata keys are best-effort
  }

  return { traces, metadataKeys };
}

export default function TracesRoute({ loaderData }: Route.ComponentProps) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const activePreset = searchParams.get("timeRange");
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const currentPage = Number(searchParams.get("page") ?? "1");

  // Parse existing metadata filters from URL
  const metadataFilters: { key: string; value: string }[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      metadataFilters.push({ key: key.slice(5), value });
    }
  }

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    }
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handlePresetChange = (preset: string) => {
    updateSearchParams({
      timeRange: preset,
      from: null,
      to: null,
      page: null,
    });
  };

  const handleCustomChange = (from: string, to: string) => {
    updateSearchParams({
      timeRange: null,
      from: from ? new Date(from).toISOString() : null,
      to: to ? new Date(to).toISOString() : null,
      page: null,
    });
  };

  const handleRefresh = () => {
    navigate(`?${searchParams.toString()}`);
  };

  const handlePageChange = (page: number) => {
    updateSearchParams({ page: String(page) });
  };

  const handleAddMetadataFilter = (filter: { key: string; value: string }) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(`meta.${filter.key}`, filter.value);
    newParams.delete("page");
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleRemoveMetadataFilter = (index: number) => {
    const filter = metadataFilters[index];
    if (!filter) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(`meta.${filter.key}`);
    newParams.delete("page");
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  const handleFetchValues = async (key: string): Promise<string[]> => {
    try {
      const result = await api
        .agents({ agentSlug: params.agentSlug! })
        .branches({ branchSlug: params.branchSlug! })
        .traces["metadata-values"].get({
          query: {
            key,
            timeRange: activePreset ?? undefined,
            from: customFrom || undefined,
            to: customTo || undefined,
          },
        });
      return Array.isArray(result.data) ? result.data : [];
    } catch {
      return [];
    }
  };

  const handleSelectTrace = async (traceId: string) => {
    setSelectedTraceId(traceId);
    setDetailLoading(true);
    try {
      const result = await api
        .agents({ agentSlug: params.agentSlug! })
        .branches({ branchSlug: params.branchSlug! })
        .traces({ traceId })
        .get();
      setTraceDetail(result.data ?? null);
    } catch {
      setTraceDetail(null);
    } finally {
      setDetailLoading(false);
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

      <div className="flex flex-col gap-2">
        <TimeRangeSelector
          activePreset={activePreset}
          customFrom={customFrom ? toLocalDatetime(customFrom) : ""}
          customTo={customTo ? toLocalDatetime(customTo) : ""}
          onPresetChange={handlePresetChange}
          onCustomChange={handleCustomChange}
          onRefresh={handleRefresh}
        />

        <MetadataFilterBar
          filters={metadataFilters}
          suggestedKeys={loaderData.metadataKeys}
          onAdd={handleAddMetadataFilter}
          onRemove={handleRemoveMetadataFilter}
          onFetchValues={handleFetchValues}
        />
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <Await resolve={loaderData.traces}>
          {(result) => {
            const data = result?.data;
            if (!data) {
              return (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
                  <p className="text-red-600">Failed to load traces</p>
                  <p className="text-sm text-muted-foreground">
                    There was an error fetching trace data. Please try again.
                  </p>
                </div>
              );
            }

            return (
              <TraceList
                traces={data.data}
                total={data.total}
                page={data.page}
                pageSize={data.pageSize}
                onSelectTrace={handleSelectTrace}
                onPageChange={handlePageChange}
              />
            );
          }}
        </Await>
      </Suspense>

      <TraceDetailPanel
        trace={traceDetail}
        open={selectedTraceId !== null}
        onClose={() => {
          setSelectedTraceId(null);
          setTraceDetail(null);
        }}
      />
    </div>
  );
}

function toLocalDatetime(iso: string): string {
  try {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}
