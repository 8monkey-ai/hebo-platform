import { ChevronRight } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Skeleton } from "@hebo/shared-ui/components/Skeleton";

import { formatDuration, formatTimestampShort, truncateText } from "./utils";

type TraceListItem = {
  timestamp: string;
  traceId: string;
  operationName: string;
  model: string;
  provider: string;
  status: string;
  durationMs: number;
  summary: string;
};

type TraceListProps = {
  traces: TraceListItem[];
  hasNextPage: boolean;
  pageSize: number;
  selectedTraceId: string | null;
  loading: boolean;
  onSelectTrace: (traceId: string) => void;
  onLoadMore: () => void;
};

export function TraceList({
  traces,
  hasNextPage,
  pageSize,
  selectedTraceId,
  loading,
  onSelectTrace,
  onLoadMore,
}: TraceListProps) {
  let content: React.ReactNode;

  if (loading && traces.length === 0) {
    content = <TraceListSkeleton />;
  } else if (traces.length === 0) {
    content = (
      <div className="flex h-full min-h-0 flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col divide-y">
        {traces.map((trace) => {
          const status =
            trace.status === "ok" || trace.status === "error" ? trace.status : "unknown";
          const isSelected = trace.traceId === selectedTraceId;

          return (
            <button
              key={trace.traceId}
              type="button"
              className={`w-full px-4 py-4 text-left transition-colors hover:bg-accent/40 ${
                isSelected ? "bg-accent/60" : ""
              }`}
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-base font-semibold">{trace.operationName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTimestampShort(trace.timestamp)}
                </span>
              </div>

              {trace.summary && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {truncateText(trace.summary, 120)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="max-w-full bg-muted break-all whitespace-normal"
                >
                  {trace.model || trace.provider || "unknown"}
                </Badge>
                <Badge variant="secondary">{formatDuration(trace.durationMs)}</Badge>
                <Badge variant={status === "error" ? "destructive" : "secondary"}>{status}</Badge>
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
    <div
      className={`flex h-full min-h-0 flex-col ${loading ? "pointer-events-none opacity-60" : ""}`}
    >
      <div className="h-0 min-h-0 flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}

function TraceListSkeleton() {
  return (
    <div className="flex min-h-full flex-col divide-y overflow-y-auto">
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
