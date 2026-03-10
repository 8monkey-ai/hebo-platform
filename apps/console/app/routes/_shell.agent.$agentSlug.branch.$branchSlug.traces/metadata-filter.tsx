import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@hebo/shared-ui/components/Button";

type MetadataFilter = { key: string; value: string };

type MetadataFilterBarProps = {
  filters: MetadataFilter[];
  suggestedKeys: string[];
  onAdd: (filter: MetadataFilter) => void;
  onRemove: (index: number) => void;
  onFetchValues: (key: string) => Promise<string[]>;
};

export function MetadataFilterBar({
  filters,
  suggestedKeys,
  onAdd,
  onRemove,
  onFetchValues,
}: MetadataFilterBarProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [valueSuggestions, setValueSuggestions] = useState<string[]>([]);
  const [showKeySuggestions, setShowKeySuggestions] = useState(false);
  const [showValueSuggestions, setShowValueSuggestions] = useState(false);

  const safeKeys = Array.isArray(suggestedKeys) ? suggestedKeys : [];
  const filteredKeys = safeKeys.filter(
    (k) => k.toLowerCase().includes(newKey.toLowerCase()) && !filters.some((f) => f.key === k),
  );
  const filteredValues = valueSuggestions.filter((v) =>
    v.toLowerCase().includes(newValue.toLowerCase()),
  );

  const handleKeySelect = async (key: string) => {
    setNewKey(key);
    setShowKeySuggestions(false);
    const values = await onFetchValues(key);
    setValueSuggestions(Array.isArray(values) ? values : []);
  };

  const handleSubmit = () => {
    if (newKey.trim() && newValue.trim()) {
      onAdd({ key: newKey.trim(), value: newValue.trim() });
      setNewKey("");
      setNewValue("");
      setValueSuggestions([]);
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">Metadata:</span>

      {filters.map((filter, i) => (
        <span
          key={`${filter.key}-${filter.value}`}
          className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-sm"
        >
          <span className="font-medium">{filter.key}</span>
          <span className="text-muted-foreground">=</span>
          <span>{filter.value}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="ml-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Key"
              value={newKey}
              onChange={(e) => {
                setNewKey(e.target.value);
                setShowKeySuggestions(true);
              }}
              onFocus={() => setShowKeySuggestions(true)}
              onBlur={() => setTimeout(() => setShowKeySuggestions(false), 200)}
              className="w-32 rounded-md border bg-background px-2 py-1 text-sm"
            />
            {showKeySuggestions && filteredKeys.length > 0 && (
              <div className="absolute top-full z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-background shadow-md">
                {filteredKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onMouseDown={() => handleKeySelect(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-muted-foreground">=</span>

          <div className="relative">
            <input
              type="text"
              placeholder="Value"
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                setShowValueSuggestions(true);
              }}
              onFocus={() => setShowValueSuggestions(true)}
              onBlur={() => setTimeout(() => setShowValueSuggestions(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") setIsAdding(false);
              }}
              className="w-32 rounded-md border bg-background px-2 py-1 text-sm"
            />
            {showValueSuggestions && filteredValues.length > 0 && (
              <div className="absolute top-full z-50 mt-1 max-h-40 w-full overflow-auto rounded-md border bg-background shadow-md">
                {filteredValues.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onMouseDown={() => {
                      setNewValue(val);
                      setShowValueSuggestions(false);
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={handleSubmit}>
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3" />
          Add filter
        </button>
      )}
    </div>
  );
}
