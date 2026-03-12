import {
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Select } from "@hebo/shared-ui/components/Select";

import { api } from "~console/lib/service";

import { TraceDetail } from "./trace-detail";
import { TraceList } from "./trace-list";
import { formatDateRangeSummary, timeRangeToParams } from "./utils";

type TraceListItem = {
  timestamp: string;
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  provider: string;
  status: string;
  durationMs: number;
  summary: string;
};

type TraceDetailData = {
  timestamp: string;
  timestampEnd: string;
  traceId: string;
  spanId: string;
  spanName: string;
  operationName: string;
  model: string;
  responseModel: string;
  provider: string;
  status: string;
  statusMessage: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  reasoningTokens: number | null;
  inputMessages: unknown;
  outputMessages: unknown;
  finishReasons: unknown;
  responseId: string;
  metadata: Record<string, string>;
  spanAttributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
};

const TIME_PRESETS = ["15m", "1h", "24h", "custom"] as const;

export default function TracesRoute() {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentSlug = params.agentSlug!;
  const branchSlug = params.branchSlug!;

  // State
  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<TraceDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [metadataTags, setMetadataTags] = useState<Record<string, string[]>>({});

  // Filter popover state
  const [showFilters, setShowFilters] = useState(false);
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");

  // Custom time range state
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Derive params from URL
  const activePreset = searchParams.get("preset") ?? "1h";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = 50;

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  // Get active metadata filters from URL
  const metaFilters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      metaFilters[key.slice(5)] = value;
    }
  }
  const activeFilterCount = Object.keys(metaFilters).length;

  // Compute from/to
  const timeRange = fromParam && toParam
    ? { from: fromParam, to: toParam }
    : timeRangeToParams(activePreset === "custom" ? "1h" : activePreset);

  // Serialize searchParams for stable dependency
  const searchParamsKey = searchParams.toString();

  // Fetch trace list
  useEffect(() => {
    let cancelled = false;
    async function fetchTraces() {
      setListLoading(true);
      setListError(null);
      try {
        const query: Record<string, string> = {
          from: timeRange.from,
          to: timeRange.to,
          page: String(page),
          pageSize: String(pageSize),
        };
        // Re-extract metadata filters from current searchParams
        const sp = new URLSearchParams(searchParamsKey);
        for (const [k, v] of sp.entries()) {
          if (k.startsWith("meta.")) {
            query[k] = v;
          }
        }

        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces.get({ query: query as any });

        if (cancelled) return;

        if (result.error) {
          setListError(String(result.error));
          return;
        }

        const data = result.data as any;
        setTraces(data?.data ?? []);
        setTotal(data?.total ?? 0);
      } catch (err) {
        if (!cancelled) {
          setListError(err instanceof Error ? err.message : "Failed to load traces");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    }

    fetchTraces();
    return () => {
      cancelled = true;
    };
  }, [agentSlug, branchSlug, timeRange.from, timeRange.to, page, searchParamsKey]);

  // Fetch metadata tags
  useEffect(() => {
    async function fetchTags() {
      try {
        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces["metadata-tags"].get({ query: { from: timeRange.from, to: timeRange.to } });

        if (result.error) return;
        const data = result.data as any;
        setMetadataTags(data?.tags ?? {});
      } catch {
        // Silently fail - tags are optional
      }
    }
    fetchTags();
  }, [agentSlug, branchSlug, timeRange.from, timeRange.to]);

  // Fetch trace detail when selected
  useEffect(() => {
    if (!selectedTraceId) {
      setTraceDetail(null);
      return;
    }

    let cancelled = false;
    async function fetchDetail() {
      setDetailLoading(true);
      try {
        const result = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces({ traceId: selectedTraceId! }).get();

        if (cancelled) return;

        if (result.error) {
          setTraceDetail(null);
          return;
        }

        setTraceDetail(result.data as any);
      } catch {
        if (!cancelled) setTraceDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedTraceId, agentSlug, branchSlug]);

  // Handlers
  function handlePresetChange(preset: string) {
    if (preset === "custom") {
      setShowCustomRange(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("preset", "custom");
      newParams.delete("page");
      setSearchParams(newParams);
      return;
    }

    setShowCustomRange(false);
    const { from, to } = timeRangeToParams(preset);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("preset", preset);
    newParams.set("from", from);
    newParams.set("to", to);
    newParams.delete("page");
    setSearchParams(newParams);
  }

  function handleApplyCustomRange() {
    if (!customFrom || !customTo) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set("preset", "custom");
    newParams.set("from", new Date(customFrom).toISOString());
    newParams.set("to", new Date(customTo).toISOString());
    newParams.delete("page");
    setSearchParams(newParams);
    setShowCustomRange(false);
  }

  function handleRefresh() {
    if (activePreset !== "custom") {
      const { from, to } = timeRangeToParams(activePreset);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("from", from);
      newParams.set("to", to);
      setSearchParams(newParams);
    } else {
      // Force re-fetch by toggling a timestamp param
      const newParams = new URLSearchParams(searchParams);
      newParams.set("_t", String(Date.now()));
      setSearchParams(newParams);
    }
  }

  function handlePageChange(newPage: number) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
  }

  function handleAddFilter() {
    if (!filterKey || !filterValue) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.set(`meta.${filterKey}`, filterValue);
    newParams.delete("page");
    setSearchParams(newParams);
    setFilterKey("");
    setFilterValue("");
  }

  function handleRemoveFilter(key: string) {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(`meta.${key}`);
    newParams.delete("page");
    setSearchParams(newParams);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="mb-4">
        <h1>Observability</h1>
        <p className="text-sm text-muted-foreground">
          Inspect recent gen_ai executions for the active branch. Evaluate prompt, model, response,
          and tool behavior for your current branch.
        </p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {/* Time presets */}
        <div className="flex items-center rounded-md border">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activePreset === preset
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              } ${preset === "15m" ? "rounded-l-md" : ""} ${preset === "custom" ? "rounded-r-md" : ""}`}
              onClick={() => handlePresetChange(preset)}
            >
              {preset === "custom" ? "Custom" : preset}
            </button>
          ))}
        </div>

        {/* Filters button */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="size-3" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Filter popover */}
          {showFilters && (
            <div className="absolute z-50 top-full mt-1 left-0 w-72 rounded-md border bg-popover p-3 shadow-md">
              <h4 className="text-sm font-medium mb-2">Edit filters</h4>

              {/* Active filters */}
              {activeFilterCount > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Active filters</p>
                  <div className="flex flex-col gap-1">
                    {Object.entries(metaFilters).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-xs bg-muted rounded-md px-2 py-1.5"
                      >
                        <span>
                          {key}: {value}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground ml-2"
                          onClick={() => handleRemoveFilter(key)}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add filter */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Add filter</p>
                <div className="flex items-end gap-1">
                  <div className="flex-1">
                    <Select
                      value={filterKey}
                      onValueChange={setFilterKey}
                      items={Object.keys(metadataTags).map((k) => ({
                        value: k,
                        label: k,
                      }))}
                      placeholder="Key"
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filterValue}
                      onValueChange={setFilterValue}
                      items={(metadataTags[filterKey] ?? []).map((v) => ({
                        value: v,
                        label: v,
                      }))}
                      placeholder="Value"
                    />
                  </div>
                  <Button size="sm" onClick={handleAddFilter} disabled={!filterKey || !filterValue}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Refresh */}
        <Button variant="outline" size="icon-sm" onClick={handleRefresh}>
          <RefreshCw className={`size-3.5 ${listLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Custom time range popover */}
      {showCustomRange && activePreset === "custom" && (
        <div className="mb-2 p-3 rounded-md border bg-muted/50 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="custom-from" className="text-xs text-muted-foreground block mb-1">Start</label>
            <input
              id="custom-from"
              type="datetime-local"
              className="text-xs rounded-md border bg-background px-2 py-1.5"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="custom-to" className="text-xs text-muted-foreground block mb-1">End</label>
            <input
              id="custom-to"
              type="datetime-local"
              className="text-xs rounded-md border bg-background px-2 py-1.5"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleApplyCustomRange}>
            Apply range
          </Button>
        </div>
      )}

      {/* Filter summary */}
      {(fromParam || activeFilterCount > 0) && (
        <p className="text-xs text-muted-foreground mb-3">
          {fromParam && toParam && formatDateRangeSummary(fromParam, toParam)}
          {activeFilterCount > 0 && (
            <>
              {fromParam && " \u00b7 "}
              {Object.entries(metaFilters)
                .map(([k, v]) => `${k}:${v}`)
                .join(", ")}
            </>
          )}
        </p>
      )}

      {/* Error state */}
      {listError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 mb-3">
          <p className="text-sm text-destructive">{listError}</p>
        </div>
      )}

      {/* Main content: list + detail side by side */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0">
        {/* Trace list */}
        <div
          className={`${
            selectedTraceId ? "lg:w-2/5 lg:min-w-[320px]" : "w-full"
          } overflow-y-auto pr-0 lg:pr-2`}
        >
          <h2 className="text-sm font-medium mb-2">GenAI executions</h2>
          <TraceList
            traces={traces}
            total={total}
            page={page}
            pageSize={pageSize}
            selectedTraceId={selectedTraceId}
            loading={listLoading}
            onSelectTrace={setSelectedTraceId}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Detail panel */}
        {selectedTraceId && (
          <div className="flex-1 min-w-0 overflow-y-auto mt-4 lg:mt-0">
            <TraceDetail
              trace={traceDetail}
              loading={detailLoading}
              onClose={() => setSelectedTraceId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
