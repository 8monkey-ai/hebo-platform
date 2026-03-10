import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hebo/shared-ui/components/Table";

import { formatDuration, formatOperationName, formatTimestamp } from "./utils";

type TraceListItem = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  status: string;
  startTime: string;
  duration: number;
};

type TraceListProps = {
  traces: TraceListItem[];
  total: number;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
  onPageChange: (page: number) => void;
  isLoading: boolean;
};

export function TraceList({
  traces,
  total,
  page,
  pageSize,
  selectedTraceId,
  onSelectTrace,
  onPageChange,
  isLoading,
}: TraceListProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (traces.length === 0 && !isLoading) {
    return (
      <div className="rounded-lg border bg-background p-12 text-center">
        <p className="text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Try expanding the time range or running some requests through the gateway.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isLoading ? "opacity-60 pointer-events-none" : ""}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Operation</TableHead>
            <TableHead className="hidden md:table-cell">Model</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {traces.map((trace) => (
            <TableRow
              key={trace.traceId}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                selectedTraceId === trace.traceId ? "bg-accent" : ""
              }`}
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {formatTimestamp(trace.startTime)}
              </TableCell>
              <TableCell className="font-medium">
                {formatOperationName(trace.operationName)}
              </TableCell>
              <TableCell className="hidden md:table-cell font-mono text-xs">
                {trace.model || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    trace.status === "OK" || trace.status === "STATUS_CODE_OK"
                      ? "secondary"
                      : "destructive"
                  }
                  className="text-xs"
                >
                  {trace.status === "STATUS_CODE_OK" ? "OK" : trace.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                {formatDuration(trace.duration)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            {total} trace{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
