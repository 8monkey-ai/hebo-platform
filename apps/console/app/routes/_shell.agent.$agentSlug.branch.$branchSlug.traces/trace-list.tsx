import { ChevronLeft, ChevronRight } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Skeleton } from "@hebo/shared-ui/components/Skeleton";

import {
  formatDuration,
  formatModelDisplay,
  formatOperationName,
  formatStatus,
  formatTimestampShort,
  truncateText,
} from "./utils";

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

type TraceListProps = {
  traces: TraceListItem[];
  total: number;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  loading: boolean;
  onSelectTrace: (traceId: string) => void;
  onPageChange: (page: number) => void;
};

export function TraceList({
  traces,
  total,
  page,
  pageSize,
  selectedTraceId,
  loading,
  onSelectTrace,
  onPageChange,
}: TraceListProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (loading && traces.length === 0) {
    return <TraceListSkeleton />;
  }

  if (!loading && traces.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${loading ? "pointer-events-none opacity-60" : ""}`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col divide-y">
          {traces.map((trace) => {
            const status = formatStatus(trace.status);
            const isSelected = trace.traceId === selectedTraceId;

            return (
              <button
                key={`${trace.traceId}-${trace.spanId}`}
                type="button"
                className={`w-full px-5 py-5 text-left transition-colors hover:bg-accent/40 ${
                  isSelected ? "bg-accent/60" : ""
                }`}
                onClick={() => onSelectTrace(trace.traceId)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-base font-semibold text-foreground">
                    {formatOperationName(trace.operationName)}
                  </span>
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
                    {formatModelDisplay(trace.provider, trace.model)}
                  </Badge>
                  <Badge variant="secondary" className="shrink-0">
                    {formatDuration(trace.durationMs)}
                  </Badge>
                  <Badge
                    variant={status === "error" ? "destructive" : "secondary"}
                    className="shrink-0"
                  >
                    {status}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex shrink-0 items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">{total} total</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TraceListSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col divide-y overflow-y-auto">
      {["one", "two", "three", "four", "five"].map((item) => (
        <div key={item} className="px-5 py-5">
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
