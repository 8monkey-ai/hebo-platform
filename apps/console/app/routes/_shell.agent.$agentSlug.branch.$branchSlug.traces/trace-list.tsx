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
import { Tooltip, TooltipContent, TooltipTrigger } from "@hebo/shared-ui/components/Tooltip";

import {
  formatDuration,
  formatOperationName,
  formatTimestamp,
  truncateId,
} from "./utils";

type TraceSummary = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  statusCode: number;
  startTime: string;
  endTime: string;
  durationMs: number;
};

type TraceListProps = {
  traces: TraceSummary[];
  total: number;
  page: number;
  pageSize: number;
  onSelectTrace: (traceId: string) => void;
  onPageChange: (page: number) => void;
};

export function TraceList({
  traces,
  total,
  page,
  pageSize,
  onSelectTrace,
  onPageChange,
}: TraceListProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground">No traces found</p>
        <p className="text-sm text-muted-foreground">
          No gen_ai traces exist for this branch in the selected time range.
          Send some requests through the gateway to see traces here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead className="hidden sm:table-cell">Trace ID</TableHead>
            <TableHead>Operation</TableHead>
            <TableHead>Model</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {traces.map((trace) => (
            <TableRow
              key={trace.traceId}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectTrace(trace.traceId)}
            >
              <TableCell className="text-muted-foreground text-sm">
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    {formatTimestamp(trace.startTime)}
                  </TooltipTrigger>
                  <TooltipContent>{new Date(trace.startTime).toLocaleString()}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">
                <Tooltip>
                  <TooltipTrigger render={<span />}>
                    {truncateId(trace.traceId)}
                  </TooltipTrigger>
                  <TooltipContent>{trace.traceId}</TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="font-medium">
                {formatOperationName(trace.operationName)}
              </TableCell>
              <TableCell className="text-sm">{trace.model}</TableCell>
              <TableCell className="hidden md:table-cell">
                {trace.statusCode <= 1 ? (
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">OK</Badge>
                ) : (
                  <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">Error</Badge>
                )}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {formatDuration(trace.durationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {total} total · Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
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
