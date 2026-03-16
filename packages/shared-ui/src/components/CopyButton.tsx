import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "#/lib/utils";

import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";

export function CopyButton({
  value,
  className,
  disabled = false,
  tooltip = "Copy to Clipboard",
  ...props
}: {
  value: string | (() => string);
  className?: string;
  disabled?: boolean;
  tooltip?: string;
} & Omit<React.ComponentProps<"button">, "value">) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (!hasCopied) return;
    const timeout = setTimeout(() => setHasCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [hasCopied]);

  const copy = () => {
    try {
      navigator.clipboard.writeText(typeof value === "function" ? value() : value);
      setHasCopied(true);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (event.defaultPrevented) return;
    copy();
  };

  return (
    <Tooltip disabled={disabled}>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "p-1.5 [&_svg:not([class*='size-'])]:size-4.5",
              "opacity-70 hover:opacity-100 disabled:opacity-50!",
              className,
            )}
            data-slot="copy-button"
            data-copied={hasCopied ? "true" : undefined}
            disabled={disabled}
            onClick={handleClick}
            {...props}
          >
            <span className="sr-only">Copy</span>
            {hasCopied ? <Check className="text-green-800" /> : <Copy />}
          </button>
        }
      />
      <TooltipContent>{hasCopied ? "Copied" : tooltip}</TooltipContent>
    </Tooltip>
  );
}
