import { Check, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./Tooltip";

/**
 * Elements carrying this attribute (including their descendants) are excluded
 * when `sourceRef` is used to derive the clipboard text from the DOM.
 */
const COPY_IGNORE_ATTR = "data-copy-ignore";

const BLOCK_TAG_PATTERN =
  /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DD|DETAILS|DIALOG|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H[1-6]|HEADER|HR|LI|MAIN|NAV|OL|P|PRE|SECTION|SUMMARY|TABLE|TR|UL)$/;

function collectCopyText(root: HTMLElement): string {
  const chunks: string[] = [];

  const pushBlockBreak = () => {
    const last = chunks.at(-1);
    if (last !== undefined && !last.endsWith("\n")) {
      chunks.push("\n");
    }
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      chunks.push(node.nodeValue ?? "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    if (el.hasAttribute(COPY_IGNORE_ATTR)) return;

    if (el.tagName === "BR") {
      chunks.push("\n");
      return;
    }

    const isBlock = BLOCK_TAG_PATTERN.test(el.tagName);
    if (isBlock) pushBlockBreak();

    for (const child of Array.from(el.childNodes)) walk(child);

    if (isBlock) pushBlockBreak();
  };

  walk(root);

  return chunks.join("").replaceAll(/\n{3,}/g, "\n\n").trim();
}

type CopyButtonOwnProps = {
  className?: string;
  disabled?: boolean;
  tooltip?: string;
  icon?: React.ReactNode;
  /**
   * The text to copy. Can be a string or a function returning a string
   * (evaluated on click, so large strings aren't held in memory between renders).
   */
  value?: string | (() => string);
  /**
   * Ref to a DOM subtree whose text content should be copied. The subtree is
   * walked on click, skipping elements annotated with `data-copy-ignore`.
   * Text inside hidden / collapsed descendants is still captured — visibility
   * is not respected on purpose, so collapsed content is copied in full.
   *
   * When both `sourceRef` and `value` are provided, `sourceRef` takes precedence.
   */
  sourceRef?: React.RefObject<HTMLElement | null>;
};

export function CopyButton({
  value,
  sourceRef,
  className,
  disabled = false,
  tooltip = "Copy to Clipboard",
  icon = <Copy />,
  ...props
}: CopyButtonOwnProps & Omit<React.ComponentProps<"button">, "value">) {
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
    if (sourceRef?.current) return collectCopyText(sourceRef.current);
    if (typeof value === "function") return value();
    return value ?? "";
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
