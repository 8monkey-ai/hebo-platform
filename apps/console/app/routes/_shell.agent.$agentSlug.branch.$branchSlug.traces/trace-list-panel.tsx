import { Filter, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@hebo/shared-ui/components/Popover";
import { Select } from "@hebo/shared-ui/components/Select";
import { Toggle } from "@hebo/shared-ui/components/Toggle";
import { ToggleGroup, ToggleGroupItem } from "@hebo/shared-ui/components/ToggleGroup";
import { cn } from "@hebo/shared-ui/lib/utils";

import { api } from "~console/lib/service";

import { TraceList } from "./trace-list";
import type { TraceListData, TraceMetadataTags } from "./types";
import { formatDateRangeSummary, timeRangeToParams } from "./utils";

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

  const activePreset = searchParams.get("preset") ?? "15m";
  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = 50;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const presetRange = useMemo(
    () => (activePreset === "custom" ? null : timeRangeToParams(activePreset)),
    [activePreset],
  );
  const fallbackCustomRange = activePreset === "custom" ? timeRangeToParams("15m") : null;
  const effectiveFrom = presetRange?.from ?? fromParam ?? fallbackCustomRange!.from;
  const effectiveTo = presetRange?.to ?? toParam ?? fallbackCustomRange!.to;

  const metaFilters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      metaFilters[key.slice(5)] = value;
    }
  }
  const activeFilterCount = Object.keys(metaFilters).length;

  const searchParamsKey = searchParams.toString();

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
          // @ts-expect-error this works in Eden
          .traces.get({ query: query });

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
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load traces");
        }
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
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("preset", preset);
    nextParams.delete("from");
    nextParams.delete("to");
    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  function handleApplyCustomRange(customFrom: string, customTo: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("preset", "custom");
    nextParams.set("from", new Date(customFrom).toISOString());
    nextParams.set("to", new Date(customTo).toISOString());
    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  function handleRefresh() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("page");
    setSearchParams(nextParams);
  }

  function handleLoadMore() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(page + 1));
    setSearchParams(nextParams);
  }

  function handleAddFilter(filterKey: string, filterValue: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set(`meta.${filterKey}`, filterValue);
    nextParams.delete("page");
    setSearchParams(nextParams);
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
        <div className="flex flex-col gap-3">
          <h2>GenAI executions</h2>

          <div className="flex flex-wrap items-center gap-2">
            <TimePresetControl
              activePreset={activePreset}
              effectiveFrom={effectiveFrom}
              effectiveTo={effectiveTo}
              isCustomPresetActive={activePreset === "custom"}
              onApplyCustomRange={handleApplyCustomRange}
              onPresetChange={handlePresetChange}
            />

            <FiltersControl
              activeFilterCount={activeFilterCount}
              metadataTags={metadataTags}
              metaFilters={metaFilters}
              onAddFilter={handleAddFilter}
              onRemoveFilter={handleRemoveFilter}
            />

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
      </div>

      <div className="flex h-0 min-h-0 flex-1 overflow-hidden">
        <TraceList
          traces={traces}
          hasNextPage={hasNextPage}
          selectedSpanId={selectedSpanId}
          loading={listLoading}
          onSelectSpan={onSelectSpan}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}

function TimePresetControl({
  activePreset,
  effectiveFrom,
  effectiveTo,
  isCustomPresetActive,
  onApplyCustomRange,
  onPresetChange,
}: {
  activePreset: string;
  effectiveFrom: string;
  effectiveTo: string;
  isCustomPresetActive: boolean;
  onApplyCustomRange: (customFrom: string, customTo: string) => void;
  onPresetChange: (preset: string) => void;
}) {
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  return (
    <Popover>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-xs">
        <ToggleGroup
          type="single"
          size="sm"
          value={activePreset === "custom" ? undefined : activePreset}
          onValueChange={(value) => value && onPresetChange(value)}
        >
          {(["15m", "1h", "24h"] as const).map((preset) => (
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

        <PopoverTrigger
          render={
            <Toggle
              size="sm"
              aria-pressed={isCustomPresetActive}
              className={cn(
                "rounded-none border-l border-input shadow-none",
                isCustomPresetActive && "bg-muted text-foreground",
              )}
              onClick={() => {
                setCustomFrom(toDateTimeLocalValue(effectiveFrom));
                setCustomTo(toDateTimeLocalValue(effectiveTo));
              }}
            >
              Custom
            </Toggle>
          }
        />
      </div>

      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Custom range</PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <Label htmlFor="custom-from" className="text-xs text-muted-foreground">
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="custom-to" className="text-xs text-muted-foreground">
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
            <Button
              size="sm"
              onClick={() => {
                if (!customFrom || !customTo) return;
                onApplyCustomRange(customFrom, customTo);
              }}
            >
              Apply range
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FiltersControl({
  activeFilterCount,
  metadataTags,
  metaFilters,
  onAddFilter,
  onRemoveFilter,
}: {
  activeFilterCount: number;
  metadataTags: TraceMetadataTags;
  metaFilters: Record<string, string>;
  onAddFilter: (filterKey: string, filterValue: string) => void;
  onRemoveFilter: (key: string) => void;
}) {
  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <Filter className="size-3" />
            Filters
            {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
          </Button>
        }
      />

      <PopoverContent align="start" className="w-72">
        <PopoverHeader>
          <PopoverTitle>Edit filters</PopoverTitle>
        </PopoverHeader>
        <div className="-mx-4 border-t" />
        <div className="flex flex-col gap-3">
          {activeFilterCount > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Active filters</p>
              <div className="flex flex-col gap-1">
                {Object.entries(metaFilters).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs"
                  >
                    <span>
                      {key}: {value}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${key} filter`}
                      onClick={() => onRemoveFilter(key)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Add filter</p>
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
                onClick={() => {
                  if (!filterKey || !filterValue) return;
                  onAddFilter(filterKey, filterValue);
                  setFilterKey("");
                  setFilterValue("");
                }}
                disabled={!filterKey || !filterValue}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
