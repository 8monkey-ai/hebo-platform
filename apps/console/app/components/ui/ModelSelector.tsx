import { Badge } from "@hebo/shared-ui/components/Badge";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@hebo/shared-ui/components/Combobox";

import type { Models } from "~console/lib/shell";
import { labelize } from "~console/lib/utils";

type ModelSelectorProps = {
  models: Models | undefined;
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

function ModelSelector({
  models,
  name,
  defaultValue,
  value: controlledValue,
  onValueChange,
  disabled,
  id,
  ...ariaProps
}: ModelSelectorProps) {
  const hasModels = models && Object.keys(models).length > 0;

  const groupedItems = (() => {
    if (!models) return [];
    const groups: Record<string, string[]> = {};
    for (const [modelId, m] of Object.entries(models)) {
      (groups[m.lab] ??= []).push(modelId);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([lab, ids]) => ({
        value: labelize(lab),
        items: ids.toSorted((a, b) => {
          const ma = models[a]!;
          const mb = models[b]!;
          return Number(mb.free) - Number(ma.free) || ma.name.localeCompare(mb.name, undefined, { numeric: true });
        }),
      }));
  })();

  return (
    <Combobox
      name={name}
      defaultValue={defaultValue}
      value={controlledValue}
      onValueChange={(val) => onValueChange?.(val as string)}
      disabled={disabled ?? !hasModels}
      items={groupedItems}
      itemToStringValue={(modelId) => models?.[modelId]?.name ?? modelId}
      filter={(modelId, query) => {
        if (!query) return true;
        const m = models?.[modelId as string];
        if (!m) return false;
        const q = query.toLowerCase();
        return m.name.toLowerCase().includes(q) || (modelId as string).toLowerCase().includes(q);
      }}
    >
      <ComboboxInput
        id={id}
        placeholder={hasModels ? "Select model..." : "Error: Couldn't load models"}
        {...ariaProps}
      />
      <ComboboxContent>
        <ComboboxEmpty>No models found.</ComboboxEmpty>
        <ComboboxList>
          <ComboboxGroup>
            <ComboboxLabel />
            <ComboboxCollection>
              {(modelId: string) => {
                const m = models?.[modelId];
                if (!m) return null;
                return (
                  <ComboboxItem key={modelId} value={modelId}>
                    {m.name}
                    <span className="ml-auto flex gap-1">
                      {m.free ? (
                        <Badge className="bg-green-600 text-white!">Free Tier</Badge>
                      ) : m.requiresByok ? (
                        <Badge className="bg-amber-600 text-white!">BYOK</Badge>
                      ) : null}
                      {m.modality === "embedding" && (
                        <Badge className="bg-blue-500 text-white!">Embeddings</Badge>
                      )}
                    </span>
                  </ComboboxItem>
                );
              }}
            </ComboboxCollection>
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export { ModelSelector };
