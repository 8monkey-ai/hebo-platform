import { RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";

const presets = ["15m", "1h", "24h"] as const;

export function TimeRangeSelector() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activePreset = searchParams.get("timeRange") ?? (searchParams.get("from") ? null : "1h");
  const customFrom = searchParams.get("from") ?? "";
  const customTo = searchParams.get("to") ?? "";

  function selectPreset(preset: string) {
    setSearchParams((prev) => {
      prev.delete("from");
      prev.delete("to");
      prev.set("timeRange", preset);
      prev.set("page", "1");
      return prev;
    });
  }

  function setCustomRange(from: string, to: string) {
    setSearchParams((prev) => {
      prev.delete("timeRange");
      prev.set("from", from);
      prev.set("to", to);
      prev.set("page", "1");
      return prev;
    });
  }

  function refresh() {
    setSearchParams((prev) => {
      prev.set("_t", Date.now().toString());
      return prev;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => selectPreset(preset)}
            className={`px-3 py-1.5 text-sm transition-colors ${
              activePreset === preset
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            } ${preset !== "15m" ? "border-l" : ""}`}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="datetime-local"
          value={customFrom}
          onChange={(e) => setCustomRange(e.target.value, customTo || new Date().toISOString().slice(0, 16))}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        />
        <span className="text-muted-foreground text-sm">to</span>
        <input
          type="datetime-local"
          value={customTo}
          onChange={(e) => setCustomRange(customFrom || new Date(Date.now() - 3600000).toISOString().slice(0, 16), e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        />
      </div>

      <Button variant="outline" size="sm" onClick={refresh}>
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
