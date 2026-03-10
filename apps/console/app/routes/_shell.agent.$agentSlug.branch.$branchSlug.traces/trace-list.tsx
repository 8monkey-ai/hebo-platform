import { Badge } from "@hebo/shared-ui/_shadcn/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hebo/shared-ui/_shadcn/ui/table";

import { Button } from "@hebo/shared-ui/components/Button";

import { formatDuration, formatOperationName, formatTimestamp } from "./utils";

type TraceItem = {
  traceId: string;
  operationName: string;
  model: string;
  status: string;
  startTime: string;
  durationMs: number;
};

type TraceListProps = {
  traces: TraceItem[];
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (traces.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
        <p className="text-xs text-muted-foreground">
          Run some requests through your agent to see traces here.
        </p>
      </div>
    );
  }

  return (
    <div className={isLoading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
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
              className={`cursor-pointer ${selectedTraceId === trace.traceId ? "bg-muted/50" : ""}`}
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <TableCell className="text-xs text-muted-foreground">
                {formatTimestamp(trace.startTime)}
              </TableCell>
              <TableCell className="font-medium">
                {formatOperationName(trace.operationName)}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {trace.model || "—"}
              </TableCell>
              <TableCell>
                <Badge variant={trace.status === "ok" ? "secondary" : "destructive"}>
                  {trace.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDuration(trace.durationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-2 py-3">
          <span className="text-xs text-muted-foreground">
            {total} trace{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="xs"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="xs"
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
