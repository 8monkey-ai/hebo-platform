import { useControl } from "@conform-to/react/future";
import { useRef } from "react";

import {
  SelectTrigger,
  Select as ShadcnSelect,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../_shadcn/ui/select";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  items: Array<{ name: React.ReactNode; value: string }>;
  placeholder?: string;
  defaultValue?: string;
}

function Select({
  name,
  disabled,
  items,
  placeholder,
  defaultValue,
}: SelectProps) {
  const selectRef = useRef<React.ComponentRef<typeof SelectTrigger> | null>(
    null,
  );
  const control = useControl({
    defaultValue,
    onFocus() {
      selectRef.current?.focus();
    },
  });

  return (
    <ShadcnSelect
      name={name}
      inputRef={(input) => control.register(input)}
      value={control.value}
      onValueChange={(value) => {
        control.change(value ?? "");
      }}
      onOpenChange={(open) => {
        if (!open) {
          control.blur();
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className="bg-background w-full min-w-0 truncate"
        ref={selectRef}
      >
        <SelectValue>
          {control.value ?? (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => {
          return (
            <SelectItem key={item.value} value={item.value}>
              {item.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </ShadcnSelect>
  );
}

export { Select };
