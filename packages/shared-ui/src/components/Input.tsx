import { Input as ShadCnInput } from "#/_shadcn/ui/input";
import { cn } from "#/lib/utils";

import { CopyButton } from "./CopyButton";

import type { LucideIcon } from "lucide-react";

interface InputProps extends React.ComponentProps<"input"> {
  icon?: LucideIcon;
  copy?: boolean;
}

export function Input({
  icon: Icon,
  copy,
  value,
  className,
  tabIndex,
  ...props
}: InputProps) {
  return (
    <div className="relative w-full min-w-0">
      {Icon && (
        <Icon
          size={16}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
          aria-hidden="true"
          focusable="false"
        />
      )}
      <ShadCnInput
        value={value}
        tabIndex={tabIndex}
        className={cn(
          "bg-background text-sm",
          Icon && "pl-8",
          copy && "pr-8 truncate",
          className,
        )}
        {...props}
      />
      {copy && (
        <CopyButton
          disabled={!value}
          aria-disabled={!value}
          tabIndex={tabIndex}
          value={value?.toString() ?? ""}
          className="absolute top-1/2 right-1 -translate-y-1/2"
        />
      )}
    </div>
  );
}
