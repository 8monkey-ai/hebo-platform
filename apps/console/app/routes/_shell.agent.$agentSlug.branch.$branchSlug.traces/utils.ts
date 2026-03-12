import { format, formatDistanceToNow } from "date-fns";
import prettyMs from "pretty-ms";

export function formatOperationName(name: string): string {
  return name.replace(/^gen_ai\./, "");
}

export function formatDuration(durationMs: number): string {
  return prettyMs(durationMs, { compact: true });
}

export function formatModelDisplay(provider: string, model: string): string {
  if (provider && model) return `${provider}/${model}`;
  return model || provider || "unknown";
}

export function formatStatus(status: string): "ok" | "error" | "unknown" {
  if (status === "ok") return "ok";
  if (status === "error") return "error";
  return "unknown";
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

export function timeRangeToParams(range: string): { from: string; to: string } {
  const now = new Date();
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
