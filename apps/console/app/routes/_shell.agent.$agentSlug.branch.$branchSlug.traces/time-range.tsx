import { Calendar, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";

const PRESETS = ["15m", "1h", "24h"] as const;

type TimeRangeProps = {
  activePreset: string | null;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: string) => void;
  onCustomChange: (from: string, to: string) => void;
  onRefresh: () => void;
};

export function TimeRangeSelector({
  activePreset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomChange,
  onRefresh,
}: TimeRangeProps) {
  const [showCustom, setShowCustom] = useState(!activePreset && (!!customFrom || !!customTo));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-lg border bg-muted p-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setShowCustom(false);
              onPresetChange(preset);
            }}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              activePreset === preset && !showCustom
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
          showCustom
            ? "border-foreground/20 bg-background text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Calendar className="size-3.5" />
        <span className="hidden sm:inline">Custom</span>
      </button>

      {showCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="datetime-local"
            value={customFrom}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <input
            type="datetime-local"
            value={customTo}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
          />
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onRefresh}>
        <RefreshCw className="size-3.5" />
        <span className="sr-only">Refresh</span>
      </Button>
    </div>
  );
}
