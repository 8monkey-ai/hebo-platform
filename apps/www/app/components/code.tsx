import * as React from "react";

import { cn } from "~www/lib/utils";

import { CopyButton } from "./copy-button";
import { Tabs } from "./tabs";

type CodeBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  children: string;
};

export function CodeBlock({ children, className, ...props }: CodeBlockProps) {
  return (
    <div
      data-slot="code-block"
      className={cn(
        "relative flex h-full w-full min-h-0 overflow-hidden rounded-md bg-background p-4",
        className,
      )}
      {...props}
    >
      <CopyButton
        value={children}
        className="absolute top-0 right-0 z-10 bg-white p-4"
      />
      <pre className="h-full w-full overflow-auto font-mono text-sm whitespace-pre">
        <code>{children}</code>
      </pre>
    </div>
  );
}

type CodeGroupProps = React.ComponentProps<typeof Tabs>;

export function CodeGroup({ className, ...props }: CodeGroupProps) {
  return (
    <Tabs
      className={cn(
        "relative flex h-full w-full min-h-0 min-w-0",
        "**:data-[slot=tabs-list]:srink-0",
        "**:data-[slot=tabs-content]:min-h-0",
        "**:data-[slot=tabs-content]:overflow-hidden",
        "**:data-[slot=code-block]:static",
        "**:data-[slot=copy-button]:p-3",
        "**:data-[slot=copy-button]:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}
