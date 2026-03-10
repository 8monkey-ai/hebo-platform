import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
} from "@hebo/shared-ui/components/Table";

import {
  formatDuration,
  formatOperationName,
  formatStatus,
  formatTimestamp,
} from "./utils";

type TraceRow = {
  timestamp: string;
  duration_nano: number;
  trace_id: string;
  span_id: string;
  span_name: string;
  span_status_code: string;
  operation_name: string | null;
  request_model: string | null;
  response_model: string | null;
  provider_name: string | null;
  input_messages: unknown;
  output_messages: unknown;
  response_id: string | null;
  finish_reasons: unknown;
  total_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_output_tokens: number | null;
};

export function TraceList({
  traces,
  total,
  page,
  pageSize,
  selectedTraceId,
  onSelectTrace,
  onPageChange,
  loading,
}: {
  traces: TraceRow[];
  total: number;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  onSelectTrace: (trace: TraceRow) => void;
  onPageChange: (page: number) => void;
  loading?: boolean;
}) {
  const totalPages = Math.ceil(total / pageSize);

  if (traces.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No traces found for this branch in the selected time range.
        </p>
        <p className="text-xs text-muted-foreground">
          Try expanding the time range or running some requests through this branch.
        </p>
      </div>
    );
  }

  return (
    <div className={loading ? "opacity-60 pointer-events-none transition-opacity" : ""}>
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
          {traces.map((trace) => {
            const statusInfo = formatStatus(trace.span_status_code);
            const isSelected = trace.trace_id === selectedTraceId;

            return (
              <TableRow
                key={`${trace.trace_id}-${trace.span_id}`}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${isSelected ? "bg-accent" : ""}`}
                onClick={() => onSelectTrace(trace)}
              >
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(trace.timestamp)}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {formatOperationName(trace.operation_name ?? trace.span_name)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground font-mono">
                  {trace.response_model ?? trace.request_model ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {formatDuration(trace.duration_nano)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3">
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
            <span className="px-2 text-xs text-muted-foreground">
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
