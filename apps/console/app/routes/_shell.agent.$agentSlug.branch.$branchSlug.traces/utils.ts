import { format } from "date-fns";
import prettyMs from "pretty-ms";

import type { TraceStatus } from "./types";

export function formatDuration(durationMs: number): string {
  return prettyMs(durationMs);
}

export function formatTimestampShort(ts: string): string {
  try {
    return format(new Date(ts), "HH:mm");
  } catch {
    return ts;
  }
}

export function formatTimestampFull(ts: string): string {
  try {
    return format(new Date(ts), "MMMM d, yyyy 'at' HH:mm:ss");
  } catch {
    return ts;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function formatTokenCount(count: number | null): string {
  if (count === null || count === undefined) return "-";
  return count.toLocaleString();
}

export function formatDateRangeSummary(from: string, to: string): string {
  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return `${format(fromDate, "MMM d, HH:mm")} to ${format(toDate, "MMM d, HH:mm")}`;
  } catch {
    return "";
  }
}

export function getTraceStatusBadgeProps(status: TraceStatus): {
  variant: "secondary" | "destructive" | "outline";
  className?: string;
} {
  switch (status) {
    case "ok":
      return {
        variant: "secondary",
        className:
          "border-transparent bg-green-600 text-white [&_a:hover]:bg-green-700 dark:bg-green-500 dark:[&_a:hover]:bg-green-400",
      };
    case "error":
      return { variant: "destructive" };
    default:
      return { variant: "outline" };
  }
}
