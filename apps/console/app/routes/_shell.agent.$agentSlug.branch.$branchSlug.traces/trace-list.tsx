import { Badge } from "@hebo/shared-ui/components/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hebo/shared-ui/components/Table";

import { formatDuration, formatRelativeTime, truncateId } from "./utils";

type TraceSummary = {
  traceId: string;
  spanId: string;
  operationName: string;
  model?: string;
  status: string;
  durationMs: number;
  startTime: string;
};

type TraceListProps = {
  traces: TraceSummary[];
  selectedTraceId?: string;
  onSelect: (traceId: string) => void;
};

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "OK" || status === "UNSET" || status === "0";
  return (
    <Badge
      variant="outline"
      className={
        isOk
          ? "border-emerald-600 text-emerald-600"
          : "border-destructive text-destructive"
      }
    >
      {isOk ? "OK" : status}
    </Badge>
  );
}

export function TraceList({ traces, selectedTraceId, onSelect }: TraceListProps) {
  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Send requests through the gateway to see traces here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead className="hidden sm:table-cell">Trace ID</TableHead>
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
              className={`cursor-pointer transition-colors ${
                selectedTraceId === trace.traceId ? "bg-accent" : "hover:bg-muted/50"
              }`}
              onClick={() => onSelect(trace.traceId)}
            >
              <TableCell className="whitespace-nowrap text-sm">
                {formatRelativeTime(trace.startTime)}
              </TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                {truncateId(trace.traceId)}
              </TableCell>
              <TableCell className="text-sm">
                {trace.operationName.replace("gen_ai.", "")}
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {trace.model ?? "-"}
              </TableCell>
              <TableCell>
                <StatusBadge status={trace.status} />
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatDuration(trace.durationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function TracePagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-3">
      <p className="text-xs text-muted-foreground">
        {total} trace{total !== 1 ? "s" : ""} found
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded-md px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="px-2 text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded-md px-3 py-1 text-sm hover:bg-accent disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
