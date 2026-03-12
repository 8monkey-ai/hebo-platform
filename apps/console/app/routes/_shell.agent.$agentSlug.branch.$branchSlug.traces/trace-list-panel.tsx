import { Filter, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Select } from "@hebo/shared-ui/components/Select";

import { api } from "~console/lib/service";

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

const TIME_PRESETS = ["15m", "1h", "24h", "custom"] as const;

type TraceListPanelProps = {
  agentSlug: string;
  branchSlug: string;
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
};

export function TraceListPanel({
  agentSlug,
  branchSlug,
  selectedTraceId,
  onSelectTrace,
}: TraceListPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [traces, setTraces] = useState<TraceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [metadataTags, setMetadataTags] = useState<Record<string, string[]>>({});

  const [showFilters, setShowFilters] = useState(false);
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activePreset = searchParams.get("preset") ?? "1h";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = 50;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const metaFilters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      metaFilters[key.slice(5)] = value;
    }
  }
  const activeFilterCount = Object.keys(metaFilters).length;
  const searchParamsKey = searchParams.toString();
  const hasTimeRange = Boolean(fromParam && toParam);

  useEffect(() => {
    if (fromParam && toParam) return;

    const { from, to } = timeRangeToParams(activePreset === "custom" ? "1h" : activePreset);
    const next = new URLSearchParams(searchParams);
    next.set("from", from);
    next.set("to", to);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [activePreset, fromParam, toParam, searchParams, setSearchParams]);

  useEffect(() => {
    if (!fromParam || !toParam) return;

    let cancelled = false;

    setListLoading(true);
    setListError(null);

    (async () => {
      try {
        const query = {
          from: fromParam,
          to: toParam,
          page: String(page),
          pageSize: String(pageSize),
          ...Object.fromEntries(
            [...new URLSearchParams(searchParamsKey)].filter(([k]) => k.startsWith("meta.")),
          ),
        };

        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces.get({ query: query as any });

        if (cancelled) return;
        if (error) return void setListError(String(error));

        setTraces(data?.data ?? []);
        setTotal(data?.total ?? 0);
      } catch (err) {
        if (!cancelled) setListError(err instanceof Error ? err.message : "Failed to load traces");
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentSlug, branchSlug, fromParam, toParam, page, pageSize, searchParamsKey]);

  useEffect(() => {
    if (!fromParam || !toParam) return;

    (async () => {
      try {
        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces.metadata.get({ query: { from: fromParam, to: toParam } });

        if (!error) setMetadataTags(data?.tags ?? {});
      } catch {
        // Tag suggestions are optional.
      }
    })();
  }, [agentSlug, branchSlug, fromParam, toParam]);

  function handlePresetChange(preset: string) {
    if (preset === "custom") {
      setShowCustomRange(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("preset", "custom");
      nextParams.delete("page");
      setSearchParams(nextParams);
      return;
    }

    setShowCustomRange(false);
    const { from, to } = timeRangeToParams(preset);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("preset", preset);
    nextParams.set("from", from);
    nextParams.set("to", to);
    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  function handleApplyCustomRange() {
    if (!customFrom || !customTo) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("preset", "custom");
    nextParams.set("from", new Date(customFrom).toISOString());
    nextParams.set("to", new Date(customTo).toISOString());
    nextParams.delete("page");
    setSearchParams(nextParams);
    setShowCustomRange(false);
  }

  function handleRefresh() {
    const nextParams = new URLSearchParams(searchParams);

    if (activePreset !== "custom") {
      const { from, to } = timeRangeToParams(activePreset);
      nextParams.set("from", from);
      nextParams.set("to", to);
    } else {
      nextParams.set("_t", String(Date.now()));
    }

    setSearchParams(nextParams);
  }

  function handlePageChange(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    setSearchParams(nextParams);
  }

  function handleAddFilter() {
    if (!filterKey || !filterValue) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(`meta.${filterKey}`, filterValue);
    nextParams.delete("page");
    setSearchParams(nextParams);
    setFilterKey("");
    setFilterValue("");
  }

  function handleRemoveFilter(key: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(`meta.${key}`);
    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  if (!hasTimeRange) {
    return null;
  }

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activePreset === preset ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              } ${preset === "15m" ? "rounded-l-md" : ""} ${preset === "custom" ? "rounded-r-md" : ""}`}
              onClick={() => handlePresetChange(preset)}
            >
              {preset === "custom" ? "Custom" : preset}
            </button>
          ))}
        </div>

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

          {showFilters && (
            <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-md border bg-popover p-3 shadow-md">
              <h4 className="mb-2 text-sm font-medium">Edit filters</h4>

              {activeFilterCount > 0 && (
                <div className="mb-3">
                  <p className="mb-1 text-xs text-muted-foreground">Active filters</p>
                  <div className="flex flex-col gap-1">
                    {Object.entries(metaFilters).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-xs"
                      >
                        <span>
                          {key}: {value}
                        </span>
                        <button
                          type="button"
                          className="ml-2 text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemoveFilter(key)}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs text-muted-foreground">Add filter</p>
                <div className="flex items-end gap-1">
                  <div className="flex-1">
                    <Select
                      value={filterKey}
                      onValueChange={setFilterKey}
                      items={Object.keys(metadataTags).map((key) => ({
                        value: key,
                        label: key,
                      }))}
                      placeholder="Key"
                    />
                  </div>
                  <div className="flex-1">
                    <Select
                      value={filterValue}
                      onValueChange={setFilterValue}
                      items={(metadataTags[filterKey] ?? []).map((value) => ({
                        value,
                        label: value,
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

        <Button variant="outline" size="icon-sm" onClick={handleRefresh}>
          <RefreshCw className={`size-3.5 ${listLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {showCustomRange && activePreset === "custom" && (
        <div className="mb-2 flex flex-wrap items-end gap-3 rounded-md border bg-muted/50 p-3">
          <div>
            <label htmlFor="custom-from" className="mb-1 block text-xs text-muted-foreground">
              Start
            </label>
            <input
              id="custom-from"
              type="datetime-local"
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="custom-to" className="mb-1 block text-xs text-muted-foreground">
              End
            </label>
            <input
              id="custom-to"
              type="datetime-local"
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </div>
          <Button size="sm" onClick={handleApplyCustomRange}>
            Apply range
          </Button>
        </div>
      )}

      {(fromParam || activeFilterCount > 0) && (
        <p className="mb-3 text-xs text-muted-foreground">
          {fromParam && toParam && formatDateRangeSummary(fromParam, toParam)}
          {activeFilterCount > 0 && (
            <>
              {fromParam && " · "}
              {Object.entries(metaFilters)
                .map(([key, value]) => `${key}:${value}`)
                .join(", ")}
            </>
          )}
        </p>
      )}

      {listError && (
        <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{listError}</p>
        </div>
      )}

      <h2 className="mb-2 text-sm font-medium">GenAI executions</h2>
      <TraceList
        traces={traces}
        total={total}
        page={page}
        pageSize={pageSize}
        selectedTraceId={selectedTraceId}
        loading={listLoading}
        onSelectTrace={onSelectTrace}
        onPageChange={handlePageChange}
      />
    </>
  );
}
