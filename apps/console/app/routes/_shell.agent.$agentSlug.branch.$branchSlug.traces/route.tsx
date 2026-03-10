import { useState } from "react";
import { useParams, useSearchParams } from "react-router";

import { TableSkeleton } from "@hebo/shared-ui/components/Skeleton";

import { api } from "~console/lib/service";

import { MetadataFilterBar } from "./metadata-filter";
import { TimeRange } from "./time-range";
import { TraceDetail } from "./trace-detail";
import { TraceList } from "./trace-list";

type TraceListItem = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  status: string;
  startTime: string;
  duration: number;
};

type TraceDetailData = {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  inputMessages?: unknown;
  outputContent?: unknown;
  toolDefinitions?: unknown;
  toolCalls?: unknown;
  requestMetadata?: Record<string, string>;
  agentSlug: string;
  branchSlug: string;
  rawSpanAttributes: Record<string, unknown>;
  rawResourceAttributes: Record<string, unknown>;
};

export default function TracesRoute() {
  const params = useParams();
  const agentSlug = params.agentSlug!;
  const branchSlug = params.branchSlug!;

  const [searchParams, setSearchParams] = useSearchParams();

  const preset = searchParams.get("preset") ?? "1h";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");
  const page = Number(searchParams.get("page") ?? 1);

  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<TraceDetailData | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [suggestedKeys, setSuggestedKeys] = useState<string[]>([]);

  const metadataFilters: { key: string; value: string }[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.") && value) {
      metadataFilters.push({ key: key.slice(5), value });
    }
  }

  const fetchTraces = async (overrides?: {
    preset?: string;
    from?: string;
    to?: string;
    page?: number;
    metaFilters?: { key: string; value: string }[];
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const effectivePreset = overrides?.preset ?? (customFrom ? undefined : preset);
      const effectiveFrom = overrides?.from ?? customFrom;
      const effectiveTo = overrides?.to ?? customTo;
      const effectivePage = overrides?.page ?? page;
      const effectiveFilters = overrides?.metaFilters ?? metadataFilters;

      const query: Record<string, string> = {
        page: String(effectivePage),
        pageSize: "50",
      };

      if (effectiveFrom && effectiveTo) {
        query.from = effectiveFrom;
        query.to = effectiveTo;
      } else if (effectivePreset) {
        query.preset = effectivePreset;
      }

      for (const f of effectiveFilters) {
        query[`meta.${f.key}`] = f.value;
      }

      const result = await api
        .agents({ agentSlug })
        .branches({ branchSlug })
        .traces.get({ query });

      if (result.data) {
        const body = result.data as { data: TraceListItem[]; total: number };
        setTraces(body.data);
        setTotal(body.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load traces");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadataKeys = async () => {
    try {
      const query: Record<string, string> = {};
      if (customFrom && customTo) {
        query.from = customFrom;
        query.to = customTo;
      } else {
        query.preset = preset;
      }

      const result = await api
        .agents({ agentSlug })
        .branches({ branchSlug })
        .traces["metadata-keys"].get({ query });

      if (result.data && Array.isArray(result.data)) {
        setSuggestedKeys(result.data);
      }
    } catch {
      // Silently fail for suggestions
    }
  };

  const fetchMetadataValues = async (key: string): Promise<string[]> => {
    try {
      const query: Record<string, string> = { key };
      if (customFrom && customTo) {
        query.from = customFrom;
        query.to = customTo;
      } else {
        query.preset = preset;
      }

      const result = await api
        .agents({ agentSlug })
        .branches({ branchSlug })
        .traces["metadata-values"].get({ query });

      return Array.isArray(result.data) ? result.data : [];
    } catch {
      return [];
    }
  };

  const fetchTraceDetail = async (traceId: string) => {
    setIsDetailLoading(true);
    try {
      const result = await api
        .agents({ agentSlug })
        .branches({ branchSlug })
        .traces({ traceId })
        .get();

      if (result.data) {
        setTraceDetail(result.data as TraceDetailData);
      }
    } catch {
      setTraceDetail(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Initial load
  const [hasLoaded, setHasLoaded] = useState(false);
  if (!hasLoaded) {
    setHasLoaded(true);
    fetchTraces();
    fetchMetadataKeys();
  }

  const handlePresetChange = (newPreset: string) => {
    const newParams = new URLSearchParams();
    newParams.set("preset", newPreset);
    for (const f of metadataFilters) {
      newParams.set(`meta.${f.key}`, f.value);
    }
    setSearchParams(newParams);
    fetchTraces({ preset: newPreset, from: undefined, to: undefined, page: 1 });
    fetchMetadataKeys();
  };

  const handleCustomRangeChange = (from: string, to: string) => {
    const newParams = new URLSearchParams();
    newParams.set("from", from);
    newParams.set("to", to);
    for (const f of metadataFilters) {
      newParams.set(`meta.${f.key}`, f.value);
    }
    setSearchParams(newParams);
    fetchTraces({ from, to, page: 1 });
    fetchMetadataKeys();
  };

  const handleRefresh = () => {
    fetchTraces();
    fetchMetadataKeys();
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
    fetchTraces({ page: newPage });
  };

  const handleSelectTrace = (traceId: string) => {
    setSelectedTraceId(traceId);
    fetchTraceDetail(traceId);
  };

  const handleAddFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set(`meta.${key}`, value);
    newParams.set("page", "1");
    setSearchParams(newParams);
    const newFilters = [...metadataFilters, { key, value }];
    fetchTraces({ metaFilters: newFilters, page: 1 });
  };

  const handleRemoveFilter = (key: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(`meta.${key}`);
    newParams.set("page", "1");
    setSearchParams(newParams);
    const newFilters = metadataFilters.filter((f) => f.key !== key);
    fetchTraces({ metaFilters: newFilters, page: 1 });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Traces</h1>
        <p className="text-sm text-muted-foreground">
          Recent gen_ai executions for this branch.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <TimeRange
          preset={customFrom ? null : preset}
          customFrom={customFrom}
          customTo={customTo}
          onPresetChange={handlePresetChange}
          onCustomRangeChange={handleCustomRangeChange}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
        <MetadataFilterBar
          filters={metadataFilters}
          suggestedKeys={suggestedKeys}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          onFetchValues={fetchMetadataValues}
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive bg-destructive/5 p-6 text-center">
          <p className="text-destructive font-medium">Failed to load traces</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm text-primary hover:underline"
            onClick={handleRefresh}
          >
            Try again
          </button>
        </div>
      ) : !hasLoaded ? (
        <TableSkeleton />
      ) : (
        <div className={`flex gap-4 ${selectedTraceId ? "flex-col lg:flex-row" : ""}`}>
          <div className={selectedTraceId ? "lg:w-1/2 lg:min-w-0" : "w-full"}>
            <TraceList
              traces={traces}
              total={total}
              page={page}
              pageSize={50}
              selectedTraceId={selectedTraceId}
              onSelectTrace={handleSelectTrace}
              onPageChange={handlePageChange}
              isLoading={isLoading}
            />
          </div>

          {selectedTraceId && (
            <div className="lg:w-1/2 lg:min-w-0 rounded-lg border bg-background p-4 overflow-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-sm">
                  Trace Details
                </h3>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSelectedTraceId(null);
                    setTraceDetail(null);
                  }}
                >
                  Close
                </button>
              </div>
              <TraceDetail trace={traceDetail} isLoading={isDetailLoading} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
