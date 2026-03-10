import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";

const PRESETS = [
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
] as const;

type TimeRangeProps = {
  preset: string | null;
  customFrom: string | null;
  customTo: string | null;
  onPresetChange: (preset: string) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
};

export function TimeRange({
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onCustomRangeChange,
  onRefresh,
  isLoading,
}: TimeRangeProps) {
  const [showCustom, setShowCustom] = useState(!!customFrom);
  const [fromInput, setFromInput] = useState(customFrom ?? "");
  const [toInput, setToInput] = useState(customTo ?? "");

  const handlePresetClick = (value: string) => {
    setShowCustom(false);
    onPresetChange(value);
  };

  const handleCustomToggle = () => {
    if (showCustom) {
      setShowCustom(false);
      onPresetChange("1h");
    } else {
      setShowCustom(true);
      const now = new Date();
      const from = new Date(now.getTime() - 60 * 60 * 1000);
      const newFrom = toLocalDatetimeString(from);
      const newTo = toLocalDatetimeString(now);
      setFromInput(newFrom);
      setToInput(newTo);
      onCustomRangeChange(from.toISOString(), now.toISOString());
    }
  };

  const handleCustomApply = () => {
    if (fromInput && toInput) {
      onCustomRangeChange(new Date(fromInput).toISOString(), new Date(toInput).toISOString());
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-md border bg-background">
        {PRESETS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
              preset === value && !showCustom
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground"
            }`}
            onClick={() => handlePresetClick(value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md border-l ${
            showCustom
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-muted-foreground"
          }`}
          onClick={handleCustomToggle}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-1.5">
          <Input
            type="datetime-local"
            value={fromInput}
            onChange={(e) => setFromInput(e.target.value)}
            className="h-8 text-xs w-auto"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="datetime-local"
            value={toInput}
            onChange={(e) => setToInput(e.target.value)}
            className="h-8 text-xs w-auto"
          />
          <Button size="sm" variant="outline" onClick={handleCustomApply} className="h-8 text-xs">
            Apply
          </Button>
        </div>
      )}

      <Button
        size="icon-sm"
        variant="ghost"
        onClick={onRefresh}
        disabled={isLoading}
        className="ml-auto"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}

function toLocalDatetimeString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}
