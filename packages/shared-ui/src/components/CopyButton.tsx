import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";

/**
 * Elements carrying this attribute (including their descendants) are excluded
 * when a DOM `RefObject` is passed as `value` to derive the clipboard text.
 */
const COPY_IGNORE_ATTR = "data-copy-ignore";

const BLOCK_TAGS = new Set(["DIV", "P", "PRE"]);

function collectCopyText(root: HTMLElement): string {
  if (root.tagName === "PRE") return root.textContent ?? "";

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? "";
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    if (el.hasAttribute(COPY_IGNORE_ATTR)) return "";
    if (el.tagName === "BR") return "\n";
    const inner = Array.from(el.childNodes)
      .map((child) => walk(child))
      .join("");
    return BLOCK_TAGS.has(el.tagName) ? `\n${inner}\n` : inner;
  };

  return walk(root).replaceAll(/\n+/g, "\n").trim();
}

/**
 * Source of the text to copy. One of:
 * - `string` — copied verbatim.
 * - `() => string` — evaluated on click, so large strings aren't built on every render.
 * - `RefObject<HTMLElement>` — the subtree is walked on click, skipping
 *   `[data-copy-ignore]` descendants. Hidden / collapsed text is captured in full.
 */
type CopyValue = string | (() => string) | React.RefObject<HTMLElement | null>;

export function CopyButton({
  value,
  className,
  disabled = false,
  tooltip = "Copy to Clipboard",
  icon = <Copy />,
  ...props
}: {
  value: CopyValue;
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
} & Omit<React.ComponentProps<"button">, "value">) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (!hasCopied) return;
    const timeout = setTimeout(() => {
      setHasCopied(false);
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [hasCopied]);

  const resolveText = (): string => {
    if (typeof value === "string") return value;
    if (typeof value === "function") return value();
    return value.current ? collectCopyText(value.current) : "";
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resolveText());
      setHasCopied(true);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    if (event.defaultPrevented) return;
    void copy();
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
            {hasCopied ? <Check className="text-green-800" /> : icon}
          </button>
        }
      />
      <TooltipContent>{hasCopied ? "Copied" : tooltip}</TooltipContent>
    </Tooltip>
  );
}
