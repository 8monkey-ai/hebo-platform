import { useState } from "react";
import { useParams } from "react-router";

import { ErrorView } from "~console/components/ui/ErrorView";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { MetadataFilterBar } from "./metadata-filter";
import { TimeRangeSelector } from "./time-range";
import { TraceDetail } from "./trace-detail";
import { TraceList } from "./trace-list";

export async function clientLoader({ params, request }: Route.ClientLoaderArgs) {
  const url = new URL(request.url);
  const query: Record<string, string> = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "_t") query[key] = value;
  }

  if (!query.timeRange && !query.from) {
    query.timeRange = "1h";
  }

  const agentApi = api.agents({ agentSlug: params.agentSlug });
  const branchTraces = agentApi.branches({ branchSlug: params.branchSlug }).traces;

  const [tracesResult, keysResult] = await Promise.all([
    branchTraces.get({ query }),
    branchTraces["metadata-keys"].get({
      query: {
        from: query.from,
        to: query.to,
        timeRange: query.timeRange,
      },
    }),
  ]);

  const traces = tracesResult.data ?? { data: [], total: 0, page: 1, pageSize: 50 };
  // Ensure suggestedKeys is always an array — the Eden treaty response wraps the
  // actual payload in { data, error }, so we unwrap .data here.
  const suggestedKeys = Array.isArray(keysResult.data) ? keysResult.data : [];

  return { traces, suggestedKeys };
}

export default function TracesRoute({ loaderData }: Route.ComponentProps) {
  const { traces, suggestedKeys } = loaderData;
  const params = useParams();
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function loadTraceDetail(traceId: string, agentSlug: string, branchSlug: string) {
    setSelectedTraceId(traceId);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const result = await api
        .agents({ agentSlug })
        .branches({ branchSlug })
        .traces({ traceId })
        .get();

      if (result.error) {
        setDetailError(String(result.error.value ?? "Failed to load trace"));
        return;
      }

      setTraceDetail(result.data as Record<string, unknown>);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load trace");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <>
      <div>
        <h1>Traces</h1>
        <p className="text-sm text-muted-foreground">
          Recent gen_ai traces for this branch. Select a trace to inspect its details.
        </p>
      </div>

      <div className="space-y-3">
        <TimeRangeSelector />
        <MetadataFilterBar suggestedKeys={suggestedKeys} />
      </div>

      <TraceList
        traces={traces.data}
        total={traces.total}
        page={traces.page}
        pageSize={traces.pageSize}
        selectedTraceId={selectedTraceId}
        onSelectTrace={(traceId) => {
          loadTraceDetail(traceId, params.agentSlug ?? "", params.branchSlug ?? "");
        }}
      />

      {detailLoading && (
        <div className="border-t pt-4 text-center text-muted-foreground">Loading trace details...</div>
      )}

      {detailError && (
        <div className="border-t pt-4 text-center text-destructive">{detailError}</div>
      )}

      {traceDetail && !detailLoading && !detailError && (
        <TraceDetail
          trace={traceDetail as any}
          onClose={() => {
            setSelectedTraceId(null);
            setTraceDetail(null);
          }}
        />
      )}
    </>
  );
}

export function ErrorBoundary() {
  return <ErrorView />;
}
