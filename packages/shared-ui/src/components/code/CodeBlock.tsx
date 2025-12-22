"use client";

import { clsx } from "clsx";
import * as React from "react";

import { CopyButton } from "./CopyButton";
import { getNodeText } from "./utils/getNodeText";

export const styles = {
  frame: "overflow-hidden bg-background border rounded-md shadow-xs not-prose",
  code: "pl-3 py-2 overflow-x-auto",
  header: "flex pl-3 space-x-4 bg-secondary",
};

export interface CodeBlockPropsBase {
  title: string;
}

export type CodeBlockProps = CodeBlockPropsBase &
  Omit<React.ComponentPropsWithoutRef<"div">, keyof CodeBlockPropsBase>;

export const CodeBlock = React.forwardRef(function CodeBlock(
  { title, children, className, ...props }: CodeBlockProps,
  ref: React.ForwardedRef<HTMLDivElement>,
) {
  const textToCopy = getNodeText(children);

  return (
    <div
      className={clsx("relative", styles.frame, className)}
      role="region"
      aria-label={`Code block: ${title}`}
      ref={ref}
      {...props}
    >
      {title ? (
        <CodeTitleBar title={title}>
          <CopyButton className="relative p-2" value={textToCopy} />
        </CodeTitleBar>
      ) : (
        <CopyButton className="absolute top-0 right-0 p-2" value={textToCopy} />
      )}
      <pre className={styles.code}>{children}</pre>
    </div>
  );
});

/**
 * Different from CodeGroup because we cannot use Headless UI's Tab component outside a Tab.Group
 * Styling should look the same though.
 */
function CodeTitleBar({
  title,
  children,
}: {
  title: string;
  children?: React.ReactElement;
}) {
  return (
    <div className={styles.header}>
      <div className="flex flex-none items-center">{title}</div>
      {children && (
        <div className="flex flex-auto items-center justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
