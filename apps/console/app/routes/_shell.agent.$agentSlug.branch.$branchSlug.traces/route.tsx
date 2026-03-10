import { Loader2, Plus, RefreshCw, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useParams, useSearchParams } from "react-router";

import { Badge } from "@hebo/shared-ui/_shadcn/ui/badge";

import { Button } from "@hebo/shared-ui/components/Button";
import { TableSkeleton } from "@hebo/shared-ui/components/Skeleton";

import { ErrorView } from "~console/components/ui/ErrorView";
import { api } from "~console/lib/service";

import { TraceDetail } from "./trace-detail";
import { TraceList } from "./trace-list";
import { timeRangeToParams } from "./utils";

type TraceListItem = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  status: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  spanAttributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
};

type TraceDetailData = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  provider: string;
  status: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  finishReason: string | null;
  inputMessages: unknown;
  outputContent: unknown;
  toolCalls: unknown;
  toolDefinitions: unknown;
  requestMetadata: Record<string, unknown>;
  spanAttributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
};

type TimeRange = "15m" | "1h" | "24h" | "custom";
const TIME_PRESETS: TimeRange[] = ["15m", "1h", "24h"];

function serializeMetadata(filters: Array<{ key: string; value: string }>): string {
  return filters.map((f) => `${f.key}:${f.value}`).join(",");
}

function deserializeMetadata(s: string | null): Array<{ key: string; value: string }> {
  if (!s) return [];
  return s
    .split(",")
    .map((entry) => {
      const [key, ...rest] = entry.split(":");
      return key && rest.length > 0 ? { key, value: rest.join(":") } : null;
    })
    .filter(Boolean) as Array<{ key: string; value: string }>;
}

export default function TracesRoute() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const agentSlug = params.agentSlug!;
  const branchSlug = params.branchSlug!;

  // Read state from URL params
  const timeRange = (searchParams.get("timeRange") ?? "1h") as TimeRange;
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const metadataFilters = deserializeMetadata(searchParams.get("metadata"));

  // Local UI state
  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedTrace, setSelectedTrace] = useState<TraceDetailData | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestedKeys, setSuggestedKeys] = useState<string[]>([]);
  const [suggestedValues, setSuggestedValues] = useState<string[]>([]);

  // Loading states
  const [isListLoading, startListTransition] = useTransition();
  const [isDetailLoading, startDetailTransition] = useTransition();
  const [isKeysLoading, startKeysTransition] = useTransition();
  const [isValuesLoading, startValuesTransition] = useTransition();

  // Filter form state
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");

  const pageSize = 50;

  // Build query params for API calls
  function getTimeParams(): { timeRange?: string; from?: string; to?: string } {
    if (timeRange === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return { timeRange };
  }

  // Fetch trace list
  function fetchTraces() {
    startListTransition(async () => {
      try {
        setError(null);
        const timeParams = getTimeParams();
        const metaStr =
          metadataFilters.length > 0 ? serializeMetadata(metadataFilters) : undefined;

        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces.get({
            query: {
              ...timeParams,
              page: String(page),
              pageSize: String(pageSize),
              ...(metaStr ? { metadata: metaStr } : {}),
            },
          });

        if (result.data) {
          setTraces(result.data.data as TraceListItem[]);
          setTotal(result.data.total);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load traces");
      }
    });
  }

  // Fetch trace detail
  function fetchTraceDetail(traceId: string) {
    setSelectedTraceId(traceId);
    startDetailTransition(async () => {
      try {
        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces({ traceId })
          .get();

        if (result.data) {
          setSelectedTrace(result.data as TraceDetailData);
        }
      } catch {
        setSelectedTrace(null);
      }
    });
  }

  // Fetch metadata key suggestions
  function fetchMetadataKeys() {
    startKeysTransition(async () => {
      try {
        const timeParams = getTimeParams();
        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces["metadata-keys"].get({ query: timeParams });

        const data = result.data;
        setSuggestedKeys(Array.isArray(data) ? data : []);
      } catch {
        setSuggestedKeys([]);
      }
    });
  }

  // Fetch metadata value suggestions
  function fetchMetadataValues(key: string) {
    startValuesTransition(async () => {
      try {
        const timeParams = getTimeParams();
        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces["metadata-values"].get({ query: { key, ...timeParams } });

        const data = result.data;
        setSuggestedValues(Array.isArray(data) ? data : []);
      } catch {
        setSuggestedValues([]);
      }
    });
  }

  // Load traces on mount and when params change
  useEffect(() => {
    fetchTraces();
  }, [agentSlug, branchSlug, timeRange, customFrom, customTo, page, searchParams.get("metadata")]);

  // Update URL params (optimistic — URL changes immediately)
  function setTimeRange(newRange: TimeRange) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("timeRange", newRange);
      next.delete("from");
      next.delete("to");
      next.set("page", "1");
      return next;
    });
  }

  function setCustomRange(from: string, to: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("timeRange", "custom");
      next.set("from", from);
      next.set("to", to);
      next.set("page", "1");
      return next;
    });
  }

  function setPage(newPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(newPage));
      return next;
    });
  }

  function addMetadataFilter(key: string, value: string) {
    if (!key || !value) return;
    const updated = [...metadataFilters, { key, value }];
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("metadata", serializeMetadata(updated));
      next.set("page", "1");
      return next;
    });
    setShowFilterForm(false);
    setFilterKey("");
    setFilterValue("");
  }

  function removeMetadataFilter(index: number) {
    const updated = metadataFilters.filter((_, i) => i !== index);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (updated.length > 0) {
        next.set("metadata", serializeMetadata(updated));
      } else {
        next.delete("metadata");
      }
      next.set("page", "1");
      return next;
    });
  }

  const panelOpen = selectedTraceId !== null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Traces</h1>
        <p className="text-sm text-muted-foreground">
          Recent gen_ai traces for this branch.
        </p>
      </div>

      {/* Single-row filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Time range presets */}
        <div className="flex items-center rounded-md border border-input">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                timeRange === preset
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              }`}
              onClick={() => setTimeRange(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <div className="flex items-center gap-1">
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            value={customFrom ? customFrom.slice(0, 16) : ""}
            onChange={(e) => {
              if (e.target.value) {
                const to = customTo || new Date().toISOString();
                setCustomRange(new Date(e.target.value).toISOString(), to);
              }
            }}
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="datetime-local"
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
            value={customTo ? customTo.slice(0, 16) : ""}
            onChange={(e) => {
              if (e.target.value) {
                const from = customFrom || new Date(Date.now() - 3_600_000).toISOString();
                setCustomRange(from, new Date(e.target.value).toISOString());
              }
            }}
          />
        </div>

        {/* Metadata filter chips */}
        {metadataFilters.map((filter, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pl-2">
            <span className="font-medium">{filter.key}</span>=
            <span>{filter.value}</span>
            <button
              type="button"
              className="ml-0.5 rounded hover:bg-muted-foreground/20"
              onClick={() => removeMetadataFilter(i)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        {/* Add filter inline form */}
        {showFilterForm ? (
          <div className="flex items-center gap-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Key"
                className="h-7 w-24 rounded-md border border-input bg-transparent px-2 text-xs"
                value={filterKey}
                onChange={(e) => {
                  setFilterKey(e.target.value);
                  if (!e.target.value) fetchMetadataKeys();
                }}
                onFocus={() => fetchMetadataKeys()}
                list="metadata-keys"
              />
              <datalist id="metadata-keys">
                {suggestedKeys.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <span className="text-xs text-muted-foreground">=</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Value"
                className="h-7 w-24 rounded-md border border-input bg-transparent px-2 text-xs"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onFocus={() => {
                  if (filterKey) fetchMetadataValues(filterKey);
                }}
                list="metadata-values"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addMetadataFilter(filterKey, filterValue);
                }}
              />
              <datalist id="metadata-values">
                {suggestedValues.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => addMetadataFilter(filterKey, filterValue)}
              disabled={!filterKey || !filterValue}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setShowFilterForm(false);
                setFilterKey("");
                setFilterValue("");
              }}
            >
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="xs" onClick={() => setShowFilterForm(true)}>
            <Plus className="size-3" />
            Filter
          </Button>
        )}

        {/* Refresh */}
        <Button variant="outline" size="xs" onClick={fetchTraces} disabled={isListLoading}>
          <RefreshCw className={`size-3 ${isListLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Trace list */}
      {isListLoading && traces.length === 0 ? (
        <TableSkeleton />
      ) : (
        <TraceList
          traces={traces}
          total={total}
          page={page}
          pageSize={pageSize}
          selectedTraceId={selectedTraceId}
          onSelectTrace={fetchTraceDetail}
          onPageChange={setPage}
          isLoading={isListLoading}
        />
      )}

      {/* Detail panel — sliding panel from right, no overlay */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full border-l border-border bg-background shadow-lg transition-transform duration-200 ease-in-out sm:w-[32rem] lg:w-[40rem] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {panelOpen && (
          <>
            {isDetailLoading && !selectedTrace ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedTrace ? (
              <TraceDetail
                trace={selectedTrace}
                onClose={() => {
                  setSelectedTraceId(null);
                  setSelectedTrace(null);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return <ErrorView />;
}
