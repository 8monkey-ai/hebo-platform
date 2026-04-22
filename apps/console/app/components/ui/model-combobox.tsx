import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import {
  Combobox,
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

type ModelEntry = {
  id: string;
  name: string;
  lab: string;
  modality: string;
  free: boolean;
  requiresByok: boolean;
};

function groupByLab(models: Models): Array<[string, ModelEntry[]]> {
  const groups: Record<string, ModelEntry[]> = {};
  for (const [id, m] of Object.entries(models)) {
    (groups[m.lab] ??= []).push({ id, ...m });
  }
  // Sort groups alphabetically by lab name
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lab, items]) => [
      lab,
      // Within each group: free tier first, then alphabetical
      items.toSorted(
        (a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name, undefined, { numeric: true }),
      ),
    ]);
}

type ModelComboboxProps = {
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

function ModelCombobox({
  models,
  name,
  defaultValue,
  value: controlledValue,
  onValueChange,
  disabled,
  id,
  ...ariaProps
}: ModelComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const hasModels = models && Object.keys(models).length > 0;

  const groups = groupByLab(models ?? {});

  return (
    <Combobox
      name={name}
      defaultValue={defaultValue}
      value={controlledValue}
      onValueChange={(val) => {
        onValueChange?.(val as string);
        setInputValue("");
      }}
      onInputValueChange={setInputValue}
      inputValue={inputValue}
      disabled={disabled || !hasModels}
    >
      <ComboboxInput
        id={id}
        placeholder={hasModels ? "Select model..." : "Error: Couldn't load models"}
        {...ariaProps}
      />
      <ComboboxContent>
        <ComboboxList>
          <ComboboxEmpty>No models found.</ComboboxEmpty>
          {groups.map(([lab, items]) => (
            <ComboboxGroup key={lab}>
              <ComboboxLabel>{labelize(lab)}</ComboboxLabel>
              {items.map((m) => (
                <ComboboxItem key={m.id} value={m.id} text={m.name}>
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
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export { ModelCombobox };
