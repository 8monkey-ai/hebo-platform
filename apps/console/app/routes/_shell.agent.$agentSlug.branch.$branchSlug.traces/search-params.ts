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
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, String(val)]));
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

  const rawPreset = searchParams.get("preset");
  const preset =
    rawPreset && (traceTimePresets as readonly string[]).includes(rawPreset)
      ? (rawPreset as (typeof traceTimePresets)[number])
      : "15m";

  const { from: effectiveFrom, to: effectiveTo } =
    preset === "custom"
      ? {
          from: searchParams.get("from") ?? fallback.from,
          to: searchParams.get("to") ?? fallback.to,
        }
      : timeRangeToParams(preset);

  const metadata = parseObjectParam(searchParams, "metadata");

  const rawStatus = searchParams.get("status");
  const status =
    rawStatus && (traceStatuses as readonly string[]).includes(rawStatus)
      ? (rawStatus as (typeof traceStatuses)[number])
      : undefined;

  const rawOperation = searchParams.get("operation");
  const operation =
    rawOperation && (traceOperations as readonly string[]).includes(rawOperation)
      ? (rawOperation as (typeof traceOperations)[number])
      : undefined;

  const rawPage = Number(searchParams.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  return { preset, effectiveFrom, effectiveTo, metadata, status, operation, page };
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
