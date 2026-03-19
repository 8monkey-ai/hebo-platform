import { Calendar, Filter, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@hebo/shared-ui/components/Empty";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@hebo/shared-ui/components/HoverCard";
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

import {
  timeRangeToParams,
  traceOperations,
  traceStatuses,
  traceTimePresets,
  useTraceSearchParams,
} from "./search-params";
import type { TraceListData } from "./types";
import {
  formatDateRangeSummary,
  formatDuration,
  formatTimestampShort,
  toDateTimeLocalValue,
  truncateText,
} from "./utils";

type TraceListProps = {
  traces: TraceListData;
  hasNextPage: boolean;
  page: number;
  metadataKeys: string[];
  loading: boolean;
  selectedTraceId: string | null;
};

export function TraceList({
  traces,
  hasNextPage,
  page,
  metadataKeys,
  loading,
  selectedTraceId,
}: TraceListProps) {
  const { effectiveFrom, effectiveTo, metadata, status, operation } = useTraceSearchParams();

  const location = useLocation();
  const pageHref = (p: number) => {
    const sp = new URLSearchParams(location.search);
    sp.set("page", String(p));
    return `?${sp}`;
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b px-4 pb-3.5">
        <h2>GenAI executions</h2>

        <div className="flex flex-wrap items-center gap-2">
          <TimePresetControl />

          <FiltersControl metadataKeys={metadataKeys} />

          <RefreshButton loading={loading} />
        </div>

        <p className="shrink-0 text-xs text-muted-foreground">
          {formatDateRangeSummary(effectiveFrom, effectiveTo)}
          {status && (
            <>
              {" · "}status: {status}
            </>
          )}
          {operation && (
            <>
              {" · "}operation: {operation}
            </>
          )}
          {Object.keys(metadata).length > 0 && (
            <>
              {" · "}
              {Object.entries(metadata)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => `${key}:${value}`)
                .join(", ")}
            </>
          )}
        </p>
      </div>

      <div
        className={cn(
          "flex h-0 min-h-0 flex-1 flex-col overflow-hidden",
          loading ? "pointer-events-none opacity-60" : "",
        )}
      >
        <ScrollArea key={page} className="h-0 min-h-0 flex-1">
          {(() => {
            if (loading && traces.length === 0) return <TraceListSkeleton />;
            if (traces.length === 0)
              return (
                <Empty className="min-h-full justify-center">
                  <EmptyHeader>
                    <EmptyTitle>No traces found</EmptyTitle>
                    <EmptyDescription>No traces found in the selected time range.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              );
            return (
              <div className="flex flex-col divide-y">
                {traces.map((trace) => {
                  const isSelected = trace.traceId === selectedTraceId;
                  return (
                    <Link
                      key={trace.traceId}
                      to={{ pathname: trace.traceId, search: location.search }}
                      className={cn(
                        "flex w-full flex-col gap-2.5 overflow-hidden px-4 py-4 text-left transition-colors hover:bg-accent/40",
                        isSelected && "bg-accent/60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {trace.model || trace.provider || "unknown"}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
                          <span className="text-muted-foreground">
                            {formatDuration(trace.durationMs)}
                          </span>
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

                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {trace.summary ? (
                          truncateText(trace.summary, 120)
                        ) : (
                          <span className="opacity-50">(no user message)</span>
                        )}
                      </p>

                      {Object.keys(trace.metadata).length > 0 && (
                        <TagStrip
                          metadata={trace.metadata}
                          activeMetadata={metadata}
                          allKeys={metadataKeys}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </ScrollArea>
        {(page > 1 || hasNextPage) && (
          <Pagination className="shrink-0 border-t px-2 py-1.5">
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
        )}
      </div>
    </div>
  );
}

const VISIBLE_TAG_COUNT = 3;

function tagStyle(key: string, allKeys: string[]) {
  const sorted = [...allKeys].sort((a, b) => a.localeCompare(b));
  const hue = Math.round((Math.max(0, sorted.indexOf(key)) * 137.508) % 360);
  return { backgroundColor: `hsl(${hue} 55% 95%)`, color: `hsl(${hue} 40% 35%)` };
}

function TagStrip({
  metadata,
  activeMetadata,
  allKeys,
}: {
  metadata: Record<string, string>;
  activeMetadata: Record<string, string>;
  allKeys: string[];
}) {
  const [open, setOpen] = useState(false);

  const { updateParams } = useTraceSearchParams();

  const entries = Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b));
  const visible = entries.slice(0, VISIBLE_TAG_COUNT);
  const overflowCount = entries.length - visible.length;
  function toggleMetadataFilter(key: string, value: string, event: React.MouseEvent) {
    event.preventDefault();
    updateParams((sp) => sp.toggleValue("metadata", key, value));
    setOpen(false);
  }

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger
        delay={250}
        closeDelay={100}
        render={
          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 mask-[linear-gradient(to_right,black_calc(100%-3rem),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)]">
              {visible.map(([key, value]) => (
                <TagBadge
                  key={key}
                  badgeKey={key}
                  value={value}
                  isActive={activeMetadata[key] === value}
                  onToggle={toggleMetadataFilter}
                  style={tagStyle(key, allKeys)}
                />
              ))}
            </div>
            {overflowCount > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground">+{overflowCount}</span>
            )}
          </div>
        }
      />
      {entries.length >= VISIBLE_TAG_COUNT && (
        <HoverCardContent
          align="start"
          className="w-auto"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          <div className="flex flex-col gap-1.5">
            {entries.map(([key, value]) => (
              <TagBadge
                key={key}
                badgeKey={key}
                value={value}
                isActive={activeMetadata[key] === value}
                onToggle={toggleMetadataFilter}
                style={tagStyle(key, allKeys)}
              />
            ))}
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
  );
}

function RemovableBadge({
  children,
  onRemove,
  label,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  label: string;
}) {
  return (
    <Badge variant="secondary" className="gap-1 bg-muted pr-1 text-muted-foreground">
      {children}
      <button
        type="button"
        className="inline-flex size-3.5 items-center justify-center rounded-sm hover:bg-accent"
        aria-label={label}
        onClick={onRemove}
      >
        <X className="size-2.5" />
      </button>
    </Badge>
  );
}

function TagBadge({
  badgeKey,
  value,
  isActive,
  onToggle,
  style,
}: {
  badgeKey: string;
  value: string;
  isActive: boolean;
  onToggle: (key: string, value: string, event: React.MouseEvent) => void;
  style?: React.CSSProperties;
}) {
  return (
    <Badge variant="secondary" className="group/tag shrink-0 gap-1 pr-1" style={style}>
      {badgeKey}: {value}
      <button
        type="button"
        className="inline-flex size-3.5 items-center justify-center rounded-sm hover:bg-accent"
        onClick={(e) => onToggle(badgeKey, value, e)}
        aria-label={isActive ? `Remove ${badgeKey} filter` : `Filter by ${badgeKey}:${value}`}
      >
        {isActive ? <X className="size-2.5" /> : <Filter className="size-2.5" />}
      </button>
    </Badge>
  );
}

function RefreshButton({ loading }: { loading: boolean }) {
  const { preset: activePreset, updateParams } = useTraceSearchParams();

  function handleRefresh() {
    updateParams((sp) => {
      if (activePreset !== "custom") {
        const { from, to } = timeRangeToParams(activePreset);
        sp.set("from", from);
        sp.set("to", to);
      }
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
      <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
    </Button>
  );
}

function TimePresetControl() {
  const { preset: activePreset, effectiveFrom, effectiveTo, updateParams } = useTraceSearchParams();

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customOpen, setCustomOpen] = useState(false);

  function applyRange(preset: (typeof traceTimePresets)[number], from?: string, to?: string) {
    const range =
      preset === "custom" && from && to
        ? { from: new Date(from).toISOString(), to: new Date(to).toISOString() }
        : timeRangeToParams(preset);

    updateParams((sp) => {
      sp.set("preset", preset);
      sp.set("from", range.from);
      sp.set("to", range.to);
    });
  }

  return (
    <Popover open={customOpen} onOpenChange={setCustomOpen}>
      <div className="inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-xs">
        <ToggleGroup
          size="sm"
          value={activePreset === "custom" ? [] : [activePreset]}
          onValueChange={(value) => {
            const preset = value[0];
            if (preset) applyRange(preset as (typeof traceTimePresets)[number]);
          }}
        >
          {traceTimePresets
            .filter((preset) => preset !== "custom")
            .map((preset, i, arr) => (
              <ToggleGroupItem
                key={preset}
                value={preset}
                size="sm"
                className={i === arr.length - 1 ? "rounded-r-none!" : undefined}
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
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!customFrom || !customTo) return;
            applyRange("custom", customFrom, customTo);
            setCustomOpen(false);
          }}
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="custom-from" className="text-xs text-muted-foreground">
              Start
            </Label>
            <Input
              id="custom-from"
              type="datetime-local"
              className="text-xs"
              value={customFrom}
              onChange={(event) => {
                setCustomFrom(event.target.value);
              }}
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
              onChange={(event) => {
                setCustomTo(event.target.value);
              }}
            />
          </div>
          <Button type="submit" size="sm" className="ml-auto">
            Apply range
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function FiltersControl({ metadataKeys }: { metadataKeys: string[] }) {
  const { metadata, status, operation, updateParams } = useTraceSearchParams();
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
          </Button>
        }
      />

      <PopoverContent align="start" className="w-sm">
        <PopoverHeader>
          <PopoverTitle>Edit filters</PopoverTitle>
        </PopoverHeader>
        <div className="-mx-4 border-t" />
        <div className="flex flex-col gap-3">
          {(Object.keys(metadata).length > 0 || status || operation) && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Active filters</p>
              <div className="flex flex-wrap gap-1">
                {status && (
                  <RemovableBadge
                    label="Remove status filter"
                    onRemove={() => updateParams((sp) => sp.delete("status"))}
                  >
                    status: {status}
                  </RemovableBadge>
                )}
                {operation && (
                  <RemovableBadge
                    label="Remove operation filter"
                    onRemove={() => updateParams((sp) => sp.delete("operation"))}
                  >
                    operation: {operation}
                  </RemovableBadge>
                )}
                {Object.entries(metadata).map(([key, value]) => (
                  <RemovableBadge
                    key={key}
                    label={`Remove ${key} filter`}
                    onRemove={() => updateParams((sp) => sp.removeValue("metadata", key))}
                  >
                    {key}: {value}
                  </RemovableBadge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-muted-foreground">Status</p>
            <Select
              value={status ?? ""}
              onValueChange={(value) =>
                updateParams((sp) => {
                  if (value) sp.set("status", value as string);
                  else sp.delete("status");
                })
              }
              items={traceStatuses.map((s) => ({ value: s, label: s === "ok" ? "OK" : "Error" }))}
              placeholder="Any status"
            />
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-muted-foreground">Operation</p>
            <Select
              value={operation ?? ""}
              onValueChange={(value) =>
                updateParams((sp) => {
                  if (value) sp.set("operation", value as string);
                  else sp.delete("operation");
                })
              }
              items={traceOperations.map((o) => ({
                value: o,
                label: o.charAt(0).toUpperCase() + o.slice(1),
              }))}
              placeholder="Any operation"
            />
          </div>

          {metadataKeys.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No metadata keys found in the selected time range.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-muted-foreground">Metadata</p>
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={filterKey}
                    onValueChange={(value) => {
                      setFilterKey(value as string);
                    }}
                    items={[...metadataKeys]
                      .sort((a, b) => a.localeCompare(b))
                      .map((key) => ({ value: key, label: key }))}
                    placeholder="Key"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Input
                    value={filterValue}
                    onChange={(e) => {
                      setFilterValue(e.target.value);
                    }}
                    placeholder="Value"
                  />
                </div>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    if (!filterKey || !filterValue) return;
                    updateParams((sp) => sp.addValue("metadata", filterKey, filterValue));
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
