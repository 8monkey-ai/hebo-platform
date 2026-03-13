import {
  parseAsInteger,
  parseAsIsoDateTime,
  parseAsJson,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useState } from "react";
import { z } from "zod";

export type TraceSearchParamsState = ReturnType<typeof useTraceSearchParams>;

export const traceTimePresets = ["15m", "1h", "24h", "custom"] as const;

const fixedQueryParsers = {
  from: parseAsIsoDateTime,
  metadata: parseAsJson(z.record(z.string(), z.string())).withDefault({}),
  page: parseAsInteger.withDefault(1),
  preset: parseAsStringLiteral(traceTimePresets).withDefault("15m"),
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
  rangeAnchorMs: number,
) {
  if (preset !== "custom") {
    return timeRangeToParams(preset, rangeAnchorMs);
  }

  const fallbackRange = timeRangeToParams("15m", rangeAnchorMs);
  return {
    from: from?.toISOString() ?? fallbackRange.from,
    to: to?.toISOString() ?? fallbackRange.to,
  };
}

export function useTraceSearchParams() {
  const [rangeAnchorMs, setRangeAnchorMs] = useState(() => Date.now());

  const [{ preset, from, to, metadata, page }, setQueryStates] = useQueryStates(fixedQueryParsers);

  const { from: effectiveFrom, to: effectiveTo } = getQueryRange(preset, from, to, rangeAnchorMs);

  const listQuery = {
    metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : undefined,
    from: effectiveFrom,
    to: effectiveTo,
    page: String(page),
  };

  function handlePresetChange(nextPreset: string) {
    void setQueryStates({
      from: null,
      page: null,
      preset: nextPreset as (typeof traceTimePresets)[number],
      to: null,
    });
    setRangeAnchorMs(Date.now());
  }

  function handleApplyCustomRange(customFrom: string, customTo: string) {
    void setQueryStates({
      from: new Date(customFrom),
      page: null,
      preset: "custom",
      to: new Date(customTo),
    });
  }

  function handleRefresh() {
    void setQueryStates({ page: null });
    setRangeAnchorMs(Date.now());
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
