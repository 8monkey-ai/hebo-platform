import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";

type MetadataFilter = { key: string; value: string };

type MetadataFilterBarProps = {
  filters: MetadataFilter[];
  onChange: (filters: MetadataFilter[]) => void;
  suggestedKeys?: string[];
};

export function MetadataFilterBar({ filters, onChange, suggestedKeys = [] }: MetadataFilterBarProps) {
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestedKeys.filter(
    (k) => k.toLowerCase().includes(newKey.toLowerCase()) && !filters.some((f) => f.key === k),
  );

  const addFilter = () => {
    if (newKey && newValue) {
      onChange([...filters, { key: newKey, value: newValue }]);
      setNewKey("");
      setNewValue("");
      setAdding(false);
    }
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Metadata:</span>

      {filters.map((filter, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs"
        >
          <span className="font-medium">{filter.key}</span>
          <span className="text-muted-foreground">=</span>
          <span>{filter.value}</span>
          <button
            type="button"
            className="ml-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => removeFilter(i)}
            aria-label={`Remove ${filter.key} filter`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {adding ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative">
            <Input
              type="text"
              placeholder="key"
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              className="h-7 w-28 text-xs"
              autoFocus
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full z-10 mt-1 max-h-32 w-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredSuggestions.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setNewKey(key);
                      setShowSuggestions(false);
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">=</span>
          <Input
            type="text"
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFilter()}
            className="h-7 w-28 text-xs"
          />
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={addFilter}>
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setAdding(false);
              setNewKey("");
              setNewValue("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3" />
          Add filter
        </button>
      )}
    </div>
  );
}
