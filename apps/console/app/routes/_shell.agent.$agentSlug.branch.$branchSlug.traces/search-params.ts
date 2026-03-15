import { useSearchParams } from "react-router";

export const traceTimePresets = ["15m", "1h", "24h", "custom"] as const;

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

export function parseTraceSearchParams(searchParams: URLSearchParams) {
  const preset = (searchParams.get("preset") ?? "15m") as (typeof traceTimePresets)[number];
  const { from: effectiveFrom, to: effectiveTo } =
    preset === "custom"
      ? {
          from: searchParams.get("from") ?? timeRangeToParams("15m").from,
          to: searchParams.get("to") ?? timeRangeToParams("15m").to,
        }
      : timeRangeToParams(preset);
  const metadata = JSON.parse(searchParams.get("metadata") ?? "{}") as Record<string, string>;
  return { preset, effectiveFrom, effectiveTo, metadata };
}

export function useTraceSearchParams() {
  const [searchParams] = useSearchParams();
  return parseTraceSearchParams(searchParams);
}
