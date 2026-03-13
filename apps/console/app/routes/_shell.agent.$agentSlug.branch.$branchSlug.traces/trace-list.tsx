import { ChevronRight } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@hebo/shared-ui/components/Empty";
import { ScrollArea } from "@hebo/shared-ui/components/ScrollArea";
import { Skeleton } from "@hebo/shared-ui/components/Skeleton";
import { cn } from "@hebo/shared-ui/lib/utils";

import type { TraceListData } from "./types";
import {
  formatDuration,
  formatTimestampShort,
  getTraceStatusBadgeProps,
  truncateText,
} from "./utils";

type TraceListProps = {
  traces: TraceListData;
  hasNextPage: boolean;
  pageSize: number;
  selectedSpanId: string | null;
  loading: boolean;
  onSelectSpan: (spanId: string) => void;
  onLoadMore: () => void;
};

export function TraceList({
  traces,
  hasNextPage,
  pageSize,
  selectedSpanId,
  loading,
  onSelectSpan,
  onLoadMore,
}: TraceListProps) {
  const loadingClassName = loading ? "pointer-events-none opacity-60" : "";

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
          const statusBadge = getTraceStatusBadgeProps(trace.status);

          return (
            <button
              key={trace.spanId}
              type="button"
              className={cn(
                "w-full px-4 py-4 text-left transition-colors hover:bg-accent/40",
                isSelected && "bg-accent/60",
              )}
              onClick={() => onSelectSpan(trace.spanId)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">
                  {trace.model ?? trace.provider ?? "unknown"}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatTimestampShort(trace.timestamp)}
                </span>
              </div>

              {trace.summary && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {truncateText(trace.summary, 120)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {trace.operationName}
                </Badge>
                <Badge variant="secondary">{formatDuration(trace.durationMs)}</Badge>
                <Badge variant={statusBadge.variant} className={statusBadge.className}>
                  {trace.status}
                </Badge>
              </div>
            </button>
          );
        })}

        {(traces.length >= pageSize || hasNextPage) && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Loaded {traces.length} trace{traces.length === 1 ? "" : "s"}
            </span>
            {hasNextPage ? (
              <Button variant="outline" size="sm" disabled={loading} onClick={onLoadMore}>
                Load more
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col", loadingClassName)}>
      <ScrollArea className="h-0 min-h-0 flex-1">{content}</ScrollArea>
    </div>
  );
}

function TraceListSkeleton() {
  return (
    <div className="flex min-h-full flex-col divide-y">
      {["one", "two", "three", "four", "five"].map((item) => (
        <div key={item} className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="mt-2 h-3 w-full" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
