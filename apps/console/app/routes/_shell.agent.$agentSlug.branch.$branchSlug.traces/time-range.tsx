import { CalendarDays, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";

const PRESETS = [
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
] as const;

type TimeRangeValue =
  | { type: "preset"; preset: string }
  | { type: "custom"; from: string; to: string };

type TimeRangeProps = {
  value: TimeRangeValue;
  onChange: (value: TimeRangeValue) => void;
  onRefresh: () => void;
};

export function TimeRangeSelector({ value, onChange, onRefresh }: TimeRangeProps) {
  const [showCustom, setShowCustom] = useState(value.type === "custom");
  const [customFrom, setCustomFrom] = useState(
    value.type === "custom" ? value.from : "",
  );
  const [customTo, setCustomTo] = useState(
    value.type === "custom" ? value.to : "",
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-md border" role="group">
        {PRESETS.map(({ label, value: presetValue }) => (
          <button
            key={presetValue}
            type="button"
            className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
              value.type === "preset" && value.preset === presetValue
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            onClick={() => {
              setShowCustom(false);
              onChange({ type: "preset", preset: presetValue });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (showCustom && customFrom && customTo) {
            onChange({ type: "custom", from: customFrom, to: customTo });
          } else {
            setShowCustom(!showCustom);
          }
        }}
        className={value.type === "custom" ? "border-primary" : ""}
      >
        <CalendarDays className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Custom</span>
      </Button>

      <Button variant="outline" size="sm" onClick={onRefresh} aria-label="Refresh">
        <RefreshCw className="size-4" aria-hidden="true" />
      </Button>

      {showCustom && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="datetime-local"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 w-auto text-sm"
            aria-label="From date"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="datetime-local"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 w-auto text-sm"
            aria-label="To date"
          />
          <Button
            size="sm"
            onClick={() => {
              if (customFrom && customTo) {
                onChange({
                  type: "custom",
                  from: new Date(customFrom).toISOString(),
                  to: new Date(customTo).toISOString(),
                });
              }
            }}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
