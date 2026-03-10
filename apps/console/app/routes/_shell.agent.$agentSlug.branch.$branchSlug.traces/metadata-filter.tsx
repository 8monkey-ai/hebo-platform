import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Input } from "@hebo/shared-ui/components/Input";

type MetadataFilterBarProps = {
  suggestedKeys: string[];
};

export function MetadataFilterBar({ suggestedKeys }: MetadataFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  // Safely handle suggestedKeys that might not be an array
  const safeKeys = Array.isArray(suggestedKeys) ? suggestedKeys : [];

  const activeFilters: Array<{ key: string; value: string }> = [];
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("meta.")) {
      activeFilters.push({ key: key.replace("meta.", ""), value });
    }
  }

  const availableKeys = safeKeys.filter(
    (k) => !activeFilters.some((f) => f.key === k),
  );

  function addFilter() {
    if (!newKey.trim() || !newValue.trim()) return;
    setSearchParams((prev) => {
      prev.set(`meta.${newKey.trim()}`, newValue.trim());
      prev.set("page", "1");
      return prev;
    });
    setNewKey("");
    setNewValue("");
    setIsAdding(false);
  }

  function removeFilter(key: string) {
    setSearchParams((prev) => {
      prev.delete(`meta.${key}`);
      prev.set("page", "1");
      return prev;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">Metadata:</span>

      {activeFilters.map(({ key, value }) => (
        <Badge key={key} variant="secondary" className="gap-1">
          {key} = {value}
          <button type="button" onClick={() => removeFilter(key)} className="hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="h-7 w-32 text-sm"
            list="metadata-keys"
          />
          <datalist id="metadata-keys">
            {availableKeys.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          <span className="text-muted-foreground">=</span>
          <Input
            placeholder="value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFilter()}
            className="h-7 w-32 text-sm"
          />
          <Button variant="outline" size="sm" onClick={addFilter} className="h-7 px-2">
            Add
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="h-7 px-2">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="h-7 gap-1 px-2">
          <Plus className="h-3 w-3" />
          Add filter
        </Button>
      )}
    </div>
  );
}
