export function formatOperationName(spanName: string): string {
  return spanName
    .replace(/^gen_ai\./, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuration(durationNano: number): string {
  const ms = durationNano / 1_000_000;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const remainingS = Math.round(s % 60);
  return `${m}m ${remainingS}s`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTokens(count: number | null): string {
  if (count === null || count === undefined) return "—";
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

export function formatStatus(statusCode: string): {
  label: string;
  variant: "default" | "destructive" | "secondary" | "outline";
} {
  if (statusCode === "STATUS_CODE_ERROR") return { label: "Error", variant: "destructive" };
  if (statusCode === "STATUS_CODE_OK") return { label: "OK", variant: "default" };
  return { label: "Unset", variant: "secondary" };
}

export function parseJsonSafe(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
