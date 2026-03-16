import { format } from "date-fns";
import prettyMs from "pretty-ms";

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

export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("sv").replace(" ", "T").slice(0, 16);
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
