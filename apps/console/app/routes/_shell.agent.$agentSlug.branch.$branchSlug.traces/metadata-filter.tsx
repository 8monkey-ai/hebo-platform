import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";

type MetadataFilter = { key: string; value: string };

type MetadataFilterBarProps = {
  filters: MetadataFilter[];
  suggestedKeys: string[];
  onAddFilter: (key: string, value: string) => void;
  onRemoveFilter: (key: string) => void;
  onFetchValues: (key: string) => Promise<string[]>;
};

export function MetadataFilterBar({
  filters,
  suggestedKeys,
  onAddFilter,
  onRemoveFilter,
  onFetchValues,
}: MetadataFilterBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [valueSuggestions, setValueSuggestions] = useState<string[]>([]);
  const [showKeySuggestions, setShowKeySuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);

  const safeKeys = Array.isArray(suggestedKeys) ? suggestedKeys : [];

  const filteredKeySuggestions = safeKeys.filter(
    (k) => k.toLowerCase().includes(newKey.toLowerCase()) && !filters.some((f) => f.key === k),
  );

  const handleSelectKey = async (key: string) => {
    setNewKey(key);
    setShowKeySuggestions(false);
    try {
      const values = await onFetchValues(key);
      setValueSuggestions(Array.isArray(values) ? values : []);
    } catch {
      setValueSuggestions([]);
    }
  };

  const handleAdd = () => {
    if (newKey && newValue) {
      onAddFilter(newKey, newValue);
      setNewKey("");
      setNewValue("");
      setValueSuggestions([]);
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
    if (e.key === "Escape") {
      setIsAdding(false);
      setNewKey("");
      setNewValue("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.length > 0 && (
        <span className="text-xs text-muted-foreground">Metadata:</span>
      )}
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs"
        >
          <span className="font-medium">{f.key}</span>
          <span className="text-muted-foreground">=</span>
          <span>{f.value}</span>
          <button
            type="button"
            className="ml-0.5 hover:text-destructive"
            onClick={() => onRemoveFilter(f.key)}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1.5 relative">
          <div className="relative">
            <Input
              placeholder="key"
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value);
                setShowKeySuggestions(true);
              }}
              onFocus={() => setShowKeySuggestions(true)}
              onBlur={() => setTimeout(() => setShowKeySuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              className="h-7 text-xs w-28"
              autoFocus
            />
            {showKeySuggestions && filteredKeySuggestions.length > 0 && (
              <div className="absolute top-full left-0 z-50 mt-1 w-40 rounded-md border bg-popover shadow-md">
                {filteredKeySuggestions.map((k) => (
                  <button
                    key={k}
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectKey(k);
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">=</span>
          <div className="relative">
            <Input
              placeholder="value"
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                setShowValueSuggestions(true);
              }}
              onFocus={() => setShowValueSuggestions(true)}
              onBlur={() => setTimeout(() => setShowValueSuggestions(false), 200)}
              onKeyDown={handleKeyDown}
              className="h-7 text-xs w-28"
            />
            {showValueSuggestions && valueSuggestions.length > 0 && (
              <div className="absolute top-full left-0 z-50 mt-1 w-40 rounded-md border bg-popover shadow-md">
                {valueSuggestions
                  .filter((v) => v.toLowerCase().includes(newValue.toLowerCase()))
                  .map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setNewValue(v);
                        setShowValueSuggestions(false);
                      }}
                    >
                      {v}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleAdd} className="h-7 text-xs">
            Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewKey("");
              setNewValue("");
            }}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsAdding(true)}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          Filter
        </Button>
      )}
    </div>
  );
}
