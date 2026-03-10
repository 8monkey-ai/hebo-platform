import { useSearchParams } from "react-router";

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

import { formatDuration, formatTimestamp, shortId } from "./utils";

type TraceSummary = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  status: string;
  durationMs: number;
  startTime: string;
};

type TraceListProps = {
  traces: TraceSummary[];
  total: number;
  page: number;
  pageSize: number;
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
};

export function TraceList({ traces, total, page, pageSize, selectedTraceId, onSelectTrace }: TraceListProps) {
  const [, setSearchParams] = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(p: number) {
    setSearchParams((prev) => {
      prev.set("page", String(p));
      return prev;
    });
  }

  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <div className="text-4xl">🔍</div>
        <h3 className="font-semibold">No traces found</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          No gen_ai traces exist for this branch in the selected time range. Send some requests through
          your agent to see traces appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
                selectedTraceId === trace.traceId ? "bg-accent" : "hover:bg-accent/50"
              }`}
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <TableCell className="text-sm whitespace-nowrap">
                {formatTimestamp(trace.startTime)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <code className="text-xs text-muted-foreground">{shortId(trace.traceId)}</code>
              </TableCell>
              <TableCell className="font-mono text-sm">{trace.operationName}</TableCell>
              <TableCell className="hidden md:table-cell text-sm">{trace.model}</TableCell>
              <TableCell>
                <Badge variant={trace.status === "OK" ? "default" : "destructive"} className="text-xs">
                  {trace.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatDuration(trace.durationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {total} trace{total !== 1 ? "s" : ""} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
