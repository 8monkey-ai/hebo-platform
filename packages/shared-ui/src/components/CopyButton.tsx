import { mergeProps, useRender } from "@base-ui/react";
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
  value: string;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
} & React.ComponentProps<"button">) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (!hasCopied) return;
    const timeout = setTimeout(() => setHasCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [hasCopied]);

  const render = (
    <button>
      <span className="sr-only">Copy</span>
      {hasCopied ? <Check className="text-green-800" /> : <Copy />}
    </button>
  );

  const copy = () => {
    try {
      navigator.clipboard.writeText(value);
      setHasCopied(true);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "[&_svg:not([class*='size-'])]:size-4.5",
          "opacity-70 hover:opacity-100 disabled:opacity-50!",
          className,
        ),
        disabled,
        onClick: copy,
      },
      props,
    ),
    render: disabled ? render : <TooltipTrigger render={render} />,
    state: {
      slot: "copy-button",
      copied: hasCopied,
    },
  });

  if (disabled) {
    return comp;
  }

  return (
    <Tooltip>
      {comp}
      <TooltipContent>{hasCopied ? "Copied" : tooltip}</TooltipContent>
    </Tooltip>
  );
}
