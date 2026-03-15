import { Calendar, Filter, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useLocation, useSearchParams } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@hebo/shared-ui/components/Empty";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@hebo/shared-ui/components/Pagination";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@hebo/shared-ui/components/Popover";
import { ScrollArea } from "@hebo/shared-ui/components/ScrollArea";
import { Select } from "@hebo/shared-ui/components/Select";
import { Skeleton } from "@hebo/shared-ui/components/Skeleton";
import { Toggle } from "@hebo/shared-ui/components/Toggle";
import { ToggleGroup, ToggleGroupItem } from "@hebo/shared-ui/components/ToggleGroup";
import { cn } from "@hebo/shared-ui/lib/utils";

import { timeRangeToParams, traceTimePresets, useTraceSearchParams } from "./search-params";
import type { TraceListData } from "./types";
import {
  formatDateRangeSummary,
  formatDuration,
  formatTimestampShort,
  toDateTimeLocalValue,
  truncateText,
} from "./utils";

type TraceListPanelProps = {
  traces: TraceListData;
  hasNextPage: boolean;
  page: number;
  metadataKeys: string[];
  loading: boolean;
  selectedSpanId: string | null;
  onSelectSpan: (spanId: string) => void;
};

export function TraceListPanel({
  traces,
  hasNextPage,
  page,
  metadataKeys,
  loading,
  selectedSpanId,
  onSelectSpan,
}: TraceListPanelProps) {
  const { effectiveFrom, effectiveTo, metadata } = useTraceSearchParams();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b px-4 pb-3.5">
        <div className="flex flex-col gap-3">
          <h2>GenAI executions</h2>

          <div className="flex flex-wrap items-center gap-2">
            <TimePresetControl />

            <FiltersControl metadataKeys={metadataKeys} />

            <RefreshButton loading={loading} />
          </div>

          <p className="shrink-0 text-xs text-muted-foreground">
            {formatDateRangeSummary(effectiveFrom, effectiveTo)}
            {Object.keys(metadata).length > 0 && (
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
          page={page}
          selectedSpanId={selectedSpanId}
          loading={loading}
          onSelectSpan={onSelectSpan}
        />
      </div>
    </div>
  );
}

function RefreshButton({ loading }: { loading: boolean }) {
  const [, setSearchParams] = useSearchParams();
  const { preset: activePreset } = useTraceSearchParams();

  function handleRefresh() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (activePreset !== "custom") {
        const { from, to } = timeRangeToParams(activePreset);
        next.set("from", from);
        next.set("to", to);
      }
      next.delete("page");
      return next;
    });
  }

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={handleRefresh}
      aria-label="Refresh traces"
      title="Refresh traces"
    >
      <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
    </Button>
  );
}

function TimePresetControl() {
  const [, setSearchParams] = useSearchParams();
  const { preset: activePreset, effectiveFrom, effectiveTo } = useTraceSearchParams();

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  function applyRange(preset: (typeof traceTimePresets)[number], from?: string, to?: string) {
    let range;

    if (preset === "custom" && from && to) {
      range = {
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      };
    } else {
      range = timeRangeToParams(preset);
    }

    setSearchParams((sp) => {
      sp.set("preset", preset);
      sp.set("from", range.from);
      sp.set("to", range.to);
      sp.delete("page");
      return sp;
    });
  }

  return (
    <Popover open={customOpen} onOpenChange={setCustomOpen}>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-xs">
        <ToggleGroup
          type="single"
          size="sm"
          value={activePreset === "custom" ? "" : activePreset}
          onValueChange={(value) =>
            value && applyRange(value[0] as (typeof traceTimePresets)[number])
          }
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
              aria-pressed={activePreset === "custom"}
              className={cn(
                "rounded-none border-l border-input shadow-none",
                activePreset === "custom" && "bg-muted text-foreground",
              )}
              onClick={() => {
                setCustomFrom(toDateTimeLocalValue(effectiveFrom));
                setCustomTo(toDateTimeLocalValue(effectiveTo));
                setCustomOpen(true);
              }}
            >
              <Calendar className="size-3.5" />
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
                applyRange("custom", customFrom, customTo);
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

function FiltersControl({ metadataKeys }: { metadataKeys: string[] }) {
  const [, setSearchParams] = useSearchParams();
  const { metadata } = useTraceSearchParams();
  const activeFilterCount = Object.keys(metadata).length;

  const [filterKey, setFilterKey] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  function refreshFilter(key: string, value: string | null) {
    setSearchParams((sp) => {
      const meta = { ...metadata };

      if (value === null) delete meta[key];
      else meta[key] = value;

      if (Object.keys(meta).length > 0) {
        sp.set("metadata", JSON.stringify(meta));
      } else {
        sp.delete("metadata");
      }

      sp.delete("page");
      return sp;
    });
  }

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

      <PopoverContent align="start" className="w-sm">
        <PopoverHeader>
          <PopoverTitle>Edit filters</PopoverTitle>
        </PopoverHeader>
        <div className="-mx-4 border-t" />
        <div className="flex flex-col gap-3">
          {activeFilterCount > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Active filters</p>
              <div className="flex flex-col gap-1">
                {Object.entries(metadata).map(([key, value]) => (
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
                      onClick={() => refreshFilter(key, null)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {metadataKeys.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No metadata keys found in the selected time range.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Add filter</p>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={filterKey}
                    onValueChange={setFilterKey}
                    items={metadataKeys.map((key) => ({ value: key, label: key }))}
                    placeholder="Key"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Input
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Value"
                  />
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    if (!filterKey || !filterValue) return;
                    refreshFilter(filterKey, filterValue);
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type TraceListProps = {
  traces: TraceListData;
  hasNextPage: boolean;
  page: number;
  selectedSpanId: string | null;
  loading: boolean;
  onSelectSpan: (spanId: string) => void;
};

function TraceList({
  traces,
  hasNextPage,
  page,
  selectedSpanId,
  loading,
  onSelectSpan,
}: TraceListProps) {
  const location = useLocation();

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(location.search);
    sp.set("page", String(p));
    return `?${sp}`;
  };

  let content: React.ReactNode;
  if (loading && traces.length === 0) {
    content = <TraceListSkeleton />;
  } else if (traces.length === 0) {
    content = (
      <Empty className="min-h-full justify-center">
        <EmptyHeader>
          <EmptyTitle>No traces found</EmptyTitle>
          <EmptyDescription>No traces found in the selected time range.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  } else {
    content = (
      <div className="flex flex-col divide-y">
        {traces.map((trace) => {
          const isSelected = trace.spanId === selectedSpanId;

          return (
            <button
              key={trace.spanId}
              type="button"
              className={cn(
                "flex w-full flex-col gap-3 overflow-hidden px-4 py-4 text-left transition-colors hover:bg-accent/40",
                isSelected && "bg-accent/60",
              )}
              onClick={() => onSelectSpan(trace.spanId)}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="truncate text-sm font-semibold">
                  {trace.model || trace.provider || "unknown"}
                </span>
                <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">{formatDuration(trace.durationMs)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span
                    className={cn(
                      trace.status === "ok" && "text-green-600 dark:text-green-500",
                      trace.status === "error" && "text-destructive",
                      trace.status === "unknown" && "text-muted-foreground",
                    )}
                  >
                    {formatTimestampShort(trace.timestamp)}
                  </span>
                </div>
              </div>

              {trace.summary && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {truncateText(trace.summary, 120)}
                </p>
              )}

              {Object.keys(trace.metadata).length > 0 && (
                <div className="flex w-full items-center gap-1.5 overflow-x-auto">
                  {Object.entries(trace.metadata).map(([key, value]) => (
                    <Badge
                      key={key}
                      variant="secondary"
                      className="shrink-0 bg-muted text-muted-foreground"
                    >
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col",
        loading ? "pointer-events-none opacity-60" : "",
      )}
    >
      <ScrollArea className="h-0 min-h-0 flex-1">{content}</ScrollArea>
      {(page > 1 || hasNextPage) && (
        <div className="shrink-0 border-t px-2 py-1.5">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink isActive href={pageHref(page)} size="sm">
                  {page}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href={pageHref(page + 1)}
                  aria-disabled={!hasNextPage}
                  className={cn(!hasNextPage && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function TraceListSkeleton() {
  return (
    <div className="flex min-h-full flex-col divide-y">
      {["one", "two", "three", "four", "five"].map((item) => (
        <div key={item} className="flex flex-col gap-2 px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
