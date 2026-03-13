import { useState } from "react";
import { useSearchParams } from "react-router";

import { timeRangeToParams } from "./utils";

export type TraceSearchParamsState = ReturnType<typeof useTraceSearchParams>;

function resolveTimeRange(
  activePreset: string,
  fromParam: string | null,
  toParam: string | null,
  rangeAnchorMs: number,
) {
  if (activePreset !== "custom") {
    return timeRangeToParams(activePreset, rangeAnchorMs);
  }

  const fallbackRange = timeRangeToParams("15m", rangeAnchorMs);

  return {
    from: fromParam ?? fallbackRange.from,
    to: toParam ?? fallbackRange.to,
  };
}

function getMetaFilters(searchParams: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      filters[key.slice(5)] = value;
    }
  }

  return filters;
}

export function useTraceSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rangeAnchorMs, setRangeAnchorMs] = useState(() => Date.now());

  const activePreset = searchParams.get("preset") ?? "15m";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const metaFilters = getMetaFilters(searchParams);
  const activeFilterCount = Object.keys(metaFilters).length;
  const queryRange = resolveTimeRange(activePreset, fromParam, toParam, rangeAnchorMs);

  function updateSearchParams(mutator: (nextParams: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParams);
    mutator(nextParams);
    setSearchParams(nextParams);
  }

  function handlePresetChange(preset: string) {
    updateSearchParams((nextParams) => {
      nextParams.set("preset", preset);
      nextParams.delete("from");
      nextParams.delete("to");
      nextParams.delete("page");
    });
    setRangeAnchorMs(Date.now());
  }

  function handleApplyCustomRange(customFrom: string, customTo: string) {
    updateSearchParams((nextParams) => {
      nextParams.set("preset", "custom");
      nextParams.set("from", new Date(customFrom).toISOString());
      nextParams.set("to", new Date(customTo).toISOString());
      nextParams.delete("page");
    });
  }

  function handleRefresh() {
    updateSearchParams((nextParams) => {
      nextParams.delete("page");
    });
    setRangeAnchorMs(Date.now());
  }

  function handleLoadMore() {
    updateSearchParams((nextParams) => {
      nextParams.set("page", String(page + 1));
    });
  }

  function handleAddFilter(filterKey: string, filterValue: string) {
    updateSearchParams((nextParams) => {
      nextParams.set(`meta.${filterKey}`, filterValue);
      nextParams.delete("page");
    });
  }

  function handleRemoveFilter(key: string) {
    updateSearchParams((nextParams) => {
      nextParams.delete(`meta.${key}`);
      nextParams.delete("page");
    });
  }

  return {
    actions: {
      handleAddFilter,
      handleApplyCustomRange,
      handleLoadMore,
      handlePresetChange,
      handleRefresh,
      handleRemoveFilter,
    },
    state: {
      activeFilterCount,
      activePreset,
      metaFilters,
      page,
      queryRange,
    },
  };
}
