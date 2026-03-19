import { useSearchParams } from "react-router";

export const traceTimePresets = ["15m", "1h", "24h", "custom"] as const;
export const traceStatuses = ["ok", "error"] as const;
export const traceOperations = ["chat", "embeddings"] as const;

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

function parseObjectParam(sp: URLSearchParams, param: string): Record<string, string> {
  try {
    const v = JSON.parse(sp.get(param) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export type TraceURLSearchParams = URLSearchParams & {
  addValue(param: string, key: string, value: string): void;
  removeValue(param: string, key: string): void;
  toggleValue(param: string, key: string, value: string): void;
};

function withObjectParams(sp: URLSearchParams): TraceURLSearchParams {
  const aug = sp as TraceURLSearchParams;
  aug.addValue = (param, key, value) => {
    const obj = parseObjectParam(sp, param);
    obj[key] = value;
    sp.set(param, JSON.stringify(obj));
  };
  aug.removeValue = (param, key) => {
    const obj = parseObjectParam(sp, param);
    delete obj[key];
    if (Object.keys(obj).length > 0) sp.set(param, JSON.stringify(obj));
    else sp.delete(param);
  };
  aug.toggleValue = (param, key, value) => {
    const obj = parseObjectParam(sp, param);
    if (obj[key] === value) aug.removeValue(param, key);
    else aug.addValue(param, key, value);
  };
  return aug;
}

export function parseTraceSearchParams(searchParams: URLSearchParams) {
  const fallback = timeRangeToParams("15m");

  const preset = ((p) =>
    p && (traceTimePresets as readonly string[]).includes(p)
      ? (p as (typeof traceTimePresets)[number])
      : "15m")(searchParams.get("preset"));

  const { from: effectiveFrom, to: effectiveTo } =
    preset === "custom"
      ? {
          from: searchParams.get("from") ?? fallback.from,
          to: searchParams.get("to") ?? fallback.to,
        }
      : timeRangeToParams(preset);

  const metadata = parseObjectParam(searchParams, "metadata");

  const status = ((s) =>
    s && (traceStatuses as readonly string[]).includes(s)
      ? (s as (typeof traceStatuses)[number])
      : undefined)(searchParams.get("status"));

  const operation = ((o) =>
    o && (traceOperations as readonly string[]).includes(o)
      ? (o as (typeof traceOperations)[number])
      : undefined)(searchParams.get("operation"));

  return { preset, effectiveFrom, effectiveTo, metadata, status, operation };
}

export function useTraceSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  function updateParams(updater: (sp: TraceURLSearchParams) => void) {
    setSearchParams((sp) => {
      updater(withObjectParams(sp));
      sp.delete("page");
      return sp;
    });
  }

  return { ...parseTraceSearchParams(searchParams), updateParams };
}
