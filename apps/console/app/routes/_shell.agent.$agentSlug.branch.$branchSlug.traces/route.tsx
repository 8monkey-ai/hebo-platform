import { useEffect, useState, useTransition } from "react";
import { useParams, useSearchParams } from "react-router";
import { Loader2, RefreshCw, X } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";

import { api } from "~console/lib/service";

import { TraceDetail } from "./trace-detail";
import { TraceList } from "./trace-list";

type TraceRow = {
  timestamp: string;
  duration_nano: number;
  trace_id: string;
  span_id: string;
  span_name: string;
  span_status_code: string;
  operation_name: string | null;
  request_model: string | null;
  response_model: string | null;
  provider_name: string | null;
  input_messages: unknown;
  output_messages: unknown;
  response_id: string | null;
  finish_reasons: unknown;
  total_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_output_tokens: number | null;
};

const TIME_PRESETS = [
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
] as const;

function parseMetaFilters(
  searchParams: URLSearchParams,
): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      filters[key.slice(5)] = value;
    }
  }
  return filters;
}

function buildQueryParams(searchParams: URLSearchParams): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  const preset = searchParams.get("preset");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const page = searchParams.get("page");

  if (preset) params.preset = preset;
  if (from) params.from = from;
  if (to) params.to = to;
  if (page) params.page = page;

  // Add metadata filters
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      params[key] = value;
    }
  }

  return params;
}

export default function TracesRoute() {
  const params = useParams<{ agentSlug: string; branchSlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [traces, setTraces] = useState<TraceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<TraceRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Metadata filter state
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [suggestedKeys, setSuggestedKeys] = useState<string[]>([]);

  const preset = searchParams.get("preset") ?? "1h";
  const customFrom = searchParams.get("from");
  const customTo = searchParams.get("to");
  const page = Number(searchParams.get("page") ?? "1");
  const metaFilters = parseMetaFilters(searchParams);
  const isCustomRange = !!(customFrom && customTo);

  // Fetch traces
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const queryParams = buildQueryParams(searchParams);

    api
      .agents({ agentSlug: params.agentSlug! })
      .branches({ branchSlug: params.branchSlug! })
      .traces.get({
        query: {
          preset: queryParams.preset,
          from: queryParams.from,
          to: queryParams.to,
          page: queryParams.page ? Number(queryParams.page) : undefined,
          pageSize: 50,
        },
      })
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setError(String(result.error));
          return;
        }
        if (result.data) {
          setTraces(result.data.data);
          setTotal(result.data.total);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load traces");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.agentSlug, params.branchSlug, searchParams]);

  // Fetch metadata key suggestions
  useEffect(() => {
    api
      .agents({ agentSlug: params.agentSlug! })
      .branches({ branchSlug: params.branchSlug! })
      .traces["metadata-keys"].get({
        query: { preset: isCustomRange ? undefined : preset, from: customFrom ?? undefined, to: customTo ?? undefined },
      })
      .then((result) => {
        if (result.data && Array.isArray(result.data)) {
          setSuggestedKeys(result.data);
        }
      })
      .catch(() => {});
  }, [params.agentSlug, params.branchSlug, preset, customFrom, customTo, isCustomRange]);

  const updateParams = (updates: Record<string, string | null>) => {
    startTransition(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      });
    });
  };

  const handlePresetChange = (value: string) => {
    updateParams({ preset: value, from: null, to: null, page: null });
  };

  const handleCustomRange = (from: string, to: string) => {
    updateParams({ from, to, preset: null, page: null });
  };

  const handleAddFilter = () => {
    if (!filterKey || !filterValue) return;
    updateParams({ [`meta.${filterKey}`]: filterValue, page: null });
    setFilterKey("");
    setFilterValue("");
  };

  const handleRemoveFilter = (key: string) => {
    updateParams({ [`meta.${key}`]: null, page: null });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const handleSelectTrace = (trace: TraceRow) => {
    if (selectedTrace?.trace_id === trace.trace_id) {
      setSelectedTrace(null);
      return;
    }
    setSelectedTrace(trace);
    setDetailLoading(true);

    // Fetch full trace detail
    api
      .agents({ agentSlug: params.agentSlug! })
      .branches({ branchSlug: params.branchSlug! })
      .traces({ traceId: trace.trace_id })
      .get()
      .then((result) => {
        if (result.data) setSelectedTrace(result.data);
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  };

  const handleRefresh = () => {
    // Trigger re-fetch by updating search params with a no-op
    updateParams({ _t: String(Date.now()) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Traces</h1>
        <p className="text-sm text-muted-foreground">
          View recent gen_ai executions for this branch.
        </p>
      </div>

      {/* Controls bar — single row with wrapping */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Time presets */}
        <div className="flex items-center rounded-md border">
          {TIME_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                !isCustomRange && preset === value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              } ${value !== "15m" ? "border-l" : ""}`}
              onClick={() => handlePresetChange(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        <div className="flex items-center gap-1">
          <Input
            type="datetime-local"
            className="h-8 text-xs w-[175px]"
            defaultValue={customFrom ?? ""}
            onChange={(e) => {
              const from = e.target.value;
              const to = customTo ?? new Date().toISOString().slice(0, 16);
              if (from) handleCustomRange(new Date(from).toISOString(), new Date(to).toISOString());
            }}
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="datetime-local"
            className="h-8 text-xs w-[175px]"
            defaultValue={customTo ?? ""}
            onChange={(e) => {
              const to = e.target.value;
              const from = customFrom ?? new Date(Date.now() - 3600000).toISOString().slice(0, 16);
              if (to) handleCustomRange(new Date(from).toISOString(), new Date(to).toISOString());
            }}
          />
        </div>

        {/* Active metadata filters */}
        {Object.entries(metaFilters).map(([key, value]) => (
          <Badge key={key} variant="secondary" className="gap-1 pr-1">
            <span className="text-xs">
              {key}={value}
            </span>
            <button
              type="button"
              className="rounded-sm hover:bg-accent p-0.5 cursor-pointer"
              onClick={() => handleRemoveFilter(key)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}

        {/* Add filter */}
        <div className="flex items-center gap-1">
          <Input
            placeholder="Key"
            className="h-8 text-xs w-[100px]"
            value={filterKey}
            onChange={(e) => setFilterKey(e.target.value)}
            list="metadata-keys"
          />
          <datalist id="metadata-keys">
            {suggestedKeys.map((key) => (
              <option key={key} value={key} />
            ))}
          </datalist>
          <Input
            placeholder="Value"
            className="h-8 text-xs w-[100px]"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddFilter();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleAddFilter}
            disabled={!filterKey || !filterValue}
          >
            + Filter
          </Button>
        </div>

        {/* Refresh */}
        <Button variant="outline" size="sm" className="h-8 ml-auto" onClick={handleRefresh}>
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Content: list + optional detail panel */}
      <div className="flex gap-4 min-h-0">
        <div
          className={`flex-1 min-w-0 ${selectedTrace ? "hidden lg:block lg:max-w-[50%]" : ""}`}
        >
          <TraceList
            traces={traces}
            total={total}
            page={page}
            pageSize={50}
            selectedTraceId={selectedTrace?.trace_id ?? null}
            onSelectTrace={handleSelectTrace}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>

        {selectedTrace && (
          <div className="flex-1 min-w-0 border rounded-lg overflow-hidden bg-background max-h-[calc(100vh-200px)] overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TraceDetail
                trace={selectedTrace}
                onClose={() => setSelectedTrace(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
