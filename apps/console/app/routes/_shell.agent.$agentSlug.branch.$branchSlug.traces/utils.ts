export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return `${Math.round(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.round(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.round(diffMs / 3_600_000)}h ago`;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTokens(n: number | null): string {
  if (n == null) return "-";
  return n.toLocaleString();
}

export function truncateText(text: string, maxLen = 500): { text: string; truncated: boolean } {
  if (text.length <= maxLen) return { text, truncated: false };
  return { text: text.slice(0, maxLen), truncated: true };
}

export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}
