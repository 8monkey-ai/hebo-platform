import {
  parseAsInteger,
  parseAsIsoDateTime,
  parseAsJson,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { z } from "zod";

export type TraceSearchParamsState = ReturnType<typeof useTraceSearchParams>;

export const traceTimePresets = ["15m", "1h", "24h", "custom"] as const;

const fixedQueryParsers = {
  from: parseAsIsoDateTime,
  metadata: parseAsJson(z.record(z.string(), z.string())).withDefault({}),
  page: parseAsInteger.withDefault(1),
  preset: parseAsStringLiteral(traceTimePresets)
    .withDefault("15m")
    .withOptions({ clearOnDefault: false }),
  to: parseAsIsoDateTime,
};

function timeRangeToParams(
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

function getQueryRange(
  preset: (typeof traceTimePresets)[number],
  from: Date | null,
  to: Date | null,
) {
  if (preset === "custom") {
    const fallbackRange = timeRangeToParams("15m");
    return {
      from: from?.toISOString() ?? fallbackRange.from,
      to: to?.toISOString() ?? fallbackRange.to,
    };
  }

  return timeRangeToParams(preset);
}

export function useTraceSearchParams() {
  const [{ preset, from, to, metadata, page }, setQueryStates] = useQueryStates(fixedQueryParsers);
  const { from: effectiveFrom, to: effectiveTo } = getQueryRange(preset, from, to);

  const listQuery = {
    metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
    from: effectiveFrom,
    to: effectiveTo,
    page: String(page),
  };

  function handlePresetChange(nextPreset: string) {
    const resolvedPreset = nextPreset as (typeof traceTimePresets)[number];
    const nextRange = timeRangeToParams(resolvedPreset);

    void setQueryStates({
      preset: resolvedPreset,
      from: new Date(nextRange.from),
      to: new Date(nextRange.to),
      page: null,
    });
  }

  function handleApplyCustomRange(customFrom: string, customTo: string) {
    void setQueryStates({
      preset: "custom",
      from: new Date(customFrom),
      to: new Date(customTo),
      page: null,
    });
  }

  function handleRefresh() {
    if (preset !== "custom") {
      const { from, to } = timeRangeToParams(preset);
      void setQueryStates({
        from: new Date(from),
        to: new Date(to),
      });
    }

    void setQueryStates({ page: null });
  }

  function handleLoadMore() {
    void setQueryStates({ page: page + 1 });
  }

  function handleAddFilter(filterKey: string, filterValue: string) {
    void setQueryStates({
      metadata: {
        ...metadata,
        [filterKey]: filterValue,
      },
      page: null,
    });
  }

  function handleRemoveFilter(key: string) {
    const nextMetadata = { ...metadata };
    delete nextMetadata[key];

    void setQueryStates({
      metadata: Object.keys(nextMetadata).length > 0 ? nextMetadata : null,
      page: null,
    });
  }

  return {
    actions: {
      handlePresetChange,
      handleApplyCustomRange,
      handleAddFilter,
      handleRemoveFilter,
      handleRefresh,
      handleLoadMore,
    },
    state: {
      queryKey: JSON.stringify(listQuery),
      activePreset: preset,
      effectiveFrom,
      effectiveTo,
      metadata,
      page,
    },
  };
}
