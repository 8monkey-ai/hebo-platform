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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
      </div>
    );
  }

  return (
    <div className={loading ? "opacity-60 pointer-events-none" : ""}>
      <div className="flex flex-col gap-2">
        {traces.map((trace) => {
          const status = formatStatus(trace.status);
          const isSelected = trace.traceId === selectedTraceId;

          return (
            <button
              key={`${trace.traceId}-${trace.spanId}`}
              type="button"
              className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${
                isSelected ? "border-primary bg-accent/50" : "border-border"
              }`}
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">
                  {formatOperationName(trace.operationName)}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimestampShort(trace.timestamp)}
                </span>
              </div>

              {trace.summary && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {truncateText(trace.summary, 120)}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                  {formatModelDisplay(trace.provider, trace.model)}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {formatDuration(trace.durationMs)}
                </Badge>
                <Badge
                  variant={status === "error" ? "destructive" : "secondary"}
                  className="text-xs shrink-0"
                >
                  {status}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            {total} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs px-2">
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
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-3">
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
