import { format, formatDistanceToNow } from "date-fns";
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

export function formatTimestampRelative(ts: string): string {
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
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

export function timeRangeToParams(
  range: string,
  nowValue: number | Date = new Date(),
): { from: string; to: string } {
  const now = typeof nowValue === "number" ? new Date(nowValue) : nowValue;
  let fromMs: number;

  switch (range) {
    case "15m":
      fromMs = now.getTime() - 15 * 60 * 1000;
      break;
    case "1h":
      fromMs = now.getTime() - 60 * 60 * 1000;
      break;
    case "24h":
      fromMs = now.getTime() - 24 * 60 * 60 * 1000;
      break;
    default:
      fromMs = now.getTime() - 60 * 60 * 1000;
  }

  return {
    from: new Date(fromMs).toISOString(),
    to: now.toISOString(),
  };
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
