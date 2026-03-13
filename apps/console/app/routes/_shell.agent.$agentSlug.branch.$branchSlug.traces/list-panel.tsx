import { Filter, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
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

import { TraceList } from "./list";
import type { TraceListData, TraceMetadataTags } from "./types";
import { traceTimePresets, useTraceSearchParams } from "./use-search-params";
import { formatDateRangeSummary } from "./utils";

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
  const [traces, setTraces] = useState<TraceListData>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [metadataTags, setMetadataTags] = useState<TraceMetadataTags>({});
  const traceSearch = useTraceSearchParams();
  const {
    handleAddFilter,
    handleApplyCustomRange,
    handleLoadMore,
    handlePresetChange,
    handleRefresh,
    handleRemoveFilter,
  } = traceSearch.actions;
  const { activePreset, effectiveFrom, effectiveTo, metadata, page, queryKey } = traceSearch.state;
  const activeFilterCount = Object.keys(metadata).length;

  useEffect(() => {
    let cancelled = false;

    setListLoading(true);
    (async () => {
      try {
        const listQuery = JSON.parse(queryKey) as Record<string, string | string[]>;
        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          // @ts-expect-error this works in Eden
          .traces.get({ query: listQuery });

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
  }, [agentSlug, branchSlug, effectiveFrom, effectiveTo, page, queryKey]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces.metadata.get({
            // @ts-expect-error this works in Eden
            query: { from: effectiveFrom, to: effectiveTo },
          });

        if (!cancelled && !error) setMetadataTags(data?.tags ?? {});
      } catch {
        // Tag suggestions are optional.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentSlug, branchSlug, effectiveFrom, effectiveTo]);

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
              metaFilters={metadata}
              onAddFilter={handleAddFilter}
              onRemoveFilter={handleRemoveFilter}
            />

            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleRefresh}
              aria-label="Refresh traces"
              title="Refresh traces"
            >
              <RefreshCw className={`size-3.5 ${listLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <p className="shrink-0 text-xs text-muted-foreground">
            {formatDateRangeSummary(effectiveFrom, effectiveTo)}
            {activeFilterCount > 0 && (
              <>
                {" · "}
                {Object.entries(metadata)
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
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <Popover open={customOpen} onOpenChange={setCustomOpen}>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-xs">
        <ToggleGroup
          type="single"
          size="sm"
          value={activePreset === "custom" ? "" : activePreset}
          onValueChange={(value) => value && onPresetChange(value[0])}
        >
          {traceTimePresets
            .filter((preset) => preset !== "custom")
            .map((preset) => (
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
                setCustomOpen(true);
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
                setCustomOpen(false);
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
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
                  onValueChange={(value) => {
                    setFilterKey(value);
                    setFilterValue("");
                  }}
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
                  setFiltersOpen(false);
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
