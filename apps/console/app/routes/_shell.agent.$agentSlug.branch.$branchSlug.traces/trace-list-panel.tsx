import { Filter, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";
import { Select } from "@hebo/shared-ui/components/Select";
import { Toggle } from "@hebo/shared-ui/components/Toggle";
import { ToggleGroup, ToggleGroupItem } from "@hebo/shared-ui/components/ToggleGroup";
import { cn } from "@hebo/shared-ui/lib/utils";

import { api } from "~console/lib/service";

import { TraceList } from "./trace-list";
import type { TraceListData, TraceMetadataTags } from "./types";
import { formatDateRangeSummary, timeRangeToParams } from "./utils";

const TIME_PRESETS = ["15m", "1h", "24h", "custom"] as const;
const STANDARD_TIME_PRESETS = TIME_PRESETS.filter((preset) => preset !== "custom");
const POPOVER_CLASS_NAME =
  "absolute top-full left-0 z-50 mt-2 rounded-lg border bg-popover p-2.5 shadow-md";
const FILTER_ROW_CLASS_NAME =
  "flex items-center justify-between rounded-md border bg-muted/50 px-2 py-1.5 text-xs";

const padDatePart = (part: number) => String(part).padStart(2, "0");

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [date.getFullYear(), padDatePart(date.getMonth() + 1), padDatePart(date.getDate())]
    .join("-")
    .concat("T")
    .concat([padDatePart(date.getHours()), padDatePart(date.getMinutes())].join(":"));
}

type TraceListPanelProps = {
  agentSlug: string;
  branchSlug: string;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
};

export function TraceListPanel({
  agentSlug,
  branchSlug,
  selectedSpanId,
  onSelectSpan,
}: TraceListPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [traces, setTraces] = useState<TraceListData>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [metadataTags, setMetadataTags] = useState<TraceMetadataTags>({});

  const [showFilters, setShowFilters] = useState(false);
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activePreset = searchParams.get("preset") ?? "1h";
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 50;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const [fallbackRange] = useState(() =>
    timeRangeToParams(activePreset === "custom" ? "1h" : activePreset),
  );
  const effectiveFrom = fromParam ?? fallbackRange.from;
  const effectiveTo = toParam ?? fallbackRange.to;

  const metaFilters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      metaFilters[key.slice(5)] = value;
    }
  }
  const activeFilterCount = Object.keys(metaFilters).length;
  const isCustomPresetActive = activePreset === "custom" || showCustomRange;
  const selectedPresetValue = activePreset === "custom" ? undefined : activePreset;
  const searchParamsKey = searchParams.toString();

  useEffect(() => {
    if (fromParam && toParam) return;

    const next = new URLSearchParams(searchParams);
    next.set("from", effectiveFrom);
    next.set("to", effectiveTo);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [effectiveFrom, effectiveTo, fromParam, searchParams, setSearchParams, toParam]);

  useEffect(() => {
    let cancelled = false;

    setListLoading(true);
    (async () => {
      try {
        const query = {
          from: effectiveFrom,
          to: effectiveTo,
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
        if (error) throw error;

        setTraces((current) => {
          if (page <= 1) {
            return data?.data ?? [];
          }

          return [...current, ...(data?.data ?? [])];
        });
        setHasNextPage(data?.hasNextPage ?? false);
      } catch (err) {
        if (!cancelled) throw err;
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentSlug, branchSlug, effectiveFrom, effectiveTo, page, pageSize, searchParamsKey]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces.metadata.get({
            // @ts-expect-error this works in Eden
            query: { from: effectiveFrom, to: effectiveTo },
          });

        if (!error) setMetadataTags(data?.tags ?? {});
      } catch {
        // Tag suggestions are optional.
      }
    })();
  }, [agentSlug, branchSlug, effectiveFrom, effectiveTo]);

  function handlePresetChange(preset: string) {
    if (preset === "custom") {
      setCustomFrom(toDateTimeLocalValue(effectiveFrom));
      setCustomTo(toDateTimeLocalValue(effectiveTo));
      setShowCustomRange(true);
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
    nextParams.delete("page");

    if (activePreset === "custom") {
      nextParams.set("_t", String(Date.now()));
    } else {
      const { from, to } = timeRangeToParams(activePreset);
      nextParams.set("from", from);
      nextParams.set("to", to);
    }

    setSearchParams(nextParams);
  }

  function handleLoadMore() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(page + 1));
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-4 pb-3.5">
        <h2 className="mb-3">GenAI executions</h2>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative">
            <div className="inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-xs">
              <ToggleGroup
                type="single"
                size="sm"
                value={selectedPresetValue}
                onValueChange={(value) => {
                  if (value) handlePresetChange(value);
                }}
              >
                {STANDARD_TIME_PRESETS.map((preset) => (
                  <ToggleGroupItem
                    key={preset}
                    value={preset}
                    size="sm"
                    className="rounded-none shadow-none"
                  >
                    {preset}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <Toggle
                size="sm"
                aria-pressed={isCustomPresetActive}
                className={cn(
                  "rounded-none border-l border-input shadow-none",
                  isCustomPresetActive && "bg-muted text-foreground",
                )}
                onClick={() => handlePresetChange("custom")}
              >
                Custom
              </Toggle>
            </div>

            {showCustomRange && (
              <div className={cn(POPOVER_CLASS_NAME, "w-80")}>
                <h4 className="mb-2">Custom range</h4>
                <div className="flex flex-col gap-2.5">
                  <div>
                    <Label htmlFor="custom-from" className="mb-1 text-xs text-muted-foreground">
                      Start
                    </Label>
                    <Input
                      id="custom-from"
                      type="datetime-local"
                      className="text-xs"
                      value={customFrom}
                      onChange={(event) => setCustomFrom(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-to" className="mb-1 text-xs text-muted-foreground">
                      End
                    </Label>
                    <Input
                      id="custom-to"
                      type="datetime-local"
                      className="text-xs"
                      value={customTo}
                      onChange={(event) => setCustomTo(event.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCustomRange(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleApplyCustomRange}>
                      Apply range
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="size-3" />
              Filters
              {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
            </Button>

            {showFilters && (
              <div className={cn(POPOVER_CLASS_NAME, "w-72")}>
                <h4>Edit filters</h4>
                <div className="-mx-2.5 my-2 border-t" />
                <div>
                  {activeFilterCount > 0 && (
                    <div className="mb-2.5">
                      <p className="text-xs text-muted-foreground">Active filters</p>
                      <div className="my-1.5 border-t" />
                      <div className="flex flex-col gap-1">
                        {Object.entries(metaFilters).map(([key, value]) => (
                          <div key={key} className={FILTER_ROW_CLASS_NAME}>
                            <span>
                              {key}: {value}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Remove ${key} filter`}
                              onClick={() => handleRemoveFilter(key)}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Add filter</p>
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
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
                      <div className="min-w-0 flex-1">
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
                      <Button
                        size="sm"
                        className="shrink-0"
                        onClick={handleAddFilter}
                        disabled={!filterKey || !filterValue}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" size="icon-sm" onClick={handleRefresh}>
            <RefreshCw className={`size-3.5 ${listLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          {formatDateRangeSummary(effectiveFrom, effectiveTo)}
          {activeFilterCount > 0 && (
            <>
              {" · "}
              {Object.entries(metaFilters)
                .map(([key, value]) => `${key}:${value}`)
                .join(", ")}
            </>
          )}
        </p>
      </div>

      <div className="flex h-0 min-h-0 flex-1 overflow-hidden">
        <TraceList
          traces={traces}
          hasNextPage={hasNextPage}
          pageSize={pageSize}
          selectedSpanId={selectedSpanId}
          loading={listLoading}
          onSelectSpan={onSelectSpan}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
