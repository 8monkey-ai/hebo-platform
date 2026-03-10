export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export function formatOperationName(spanName: string): string {
  return spanName.replace(/^gen_ai\./, "");
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return `${Math.floor(diffMs / 1000)}s ago`;
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return count.toString();
  return `${(count / 1000).toFixed(1)}k`;
}

export function truncateText(text: string, maxLength: number = 300): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function getPresetRange(preset: string): { from: Date; to: Date } {
  const now = new Date();
  const presetMs: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };
  return {
    from: new Date(now.getTime() - (presetMs[preset] ?? presetMs["1h"])),
    to: now,
  };
}
