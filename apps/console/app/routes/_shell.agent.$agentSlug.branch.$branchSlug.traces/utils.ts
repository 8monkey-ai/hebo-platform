export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function truncateId(id: string, length = 8): string {
  return id.length > length ? id.slice(0, length) + "..." : id;
}

export function formatToolCallSignature(name: string, args: unknown): string {
  if (!args || typeof args !== "object") return `${name}()`;
  const entries = Object.entries(args as Record<string, unknown>);
  if (entries.length === 0) return `${name}()`;
  const params = entries
    .slice(0, 3)
    .map(([, v]) => {
      if (typeof v === "string") return v.length > 30 ? `"${v.slice(0, 30)}..."` : `"${v}"`;
      return JSON.stringify(v);
    })
    .join(", ");
  const suffix = entries.length > 3 ? ", ..." : "";
  return `${name}(${params}${suffix})`;
}
