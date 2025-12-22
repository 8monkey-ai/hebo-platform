import * as React from "react";

import { cn } from "#/lib/utils";

import { CopyButton } from "./CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

const getNodeText = (node: React.ReactNode): string => {
  if (["string", "number"].includes(typeof node)) {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map((child) => getNodeText(child)).join("");
  }
  if (React.isValidElement(node)) {
    return getNodeText(
      (node as React.ReactElement<{ children?: React.ReactNode }>).props
        .children,
    );
  }
  return "";
};

type CodeBlockProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  title?: React.ReactNode;
};

export function CodeBlock({
  children,
  className,
  title,
  ...props
}: CodeBlockProps) {
  return (
    <div
      data-slot="code-block"
      className={cn(
        "relative flex flex-col h-full w-full min-h-0 overflow-hidden rounded-md bg-background",
        className,
      )}
      {...props}
    >
      {title ? (
        <div className="bg-secondary flex items-center justify-between gap-1 p-2">
          <span className="text-foreground text-sm font-medium">{title}</span>
          <CopyButton value={getNodeText(children)} className="" />
        </div>
      ) : (
        <CopyButton
          value={getNodeText(children)}
          className="absolute top-0 right-0 z-10 bg-white p-2.5"
        />
      )}
      <pre className="h-full w-full overflow-auto p-2 font-mono text-sm whitespace-pre">
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
        "relative flex h-full w-full min-h-0 min-w-0 gap-0",
        "bg-secondary overflow-hidden rounded-lg",
        "**:data-[slot=tabs-list]:py-1",
        "**:data-[slot=tabs-list]:bg-secondary",
        "**:data-[slot=tabs-content]:min-h-0",
        "**:data-[slot=tabs-content]:overflow-hidden",
        "**:data-[slot=code-block]:static",
        "**:data-[slot=copy-button]:p-2.5",
        "**:data-[slot=copy-button]:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

type CodeGroupMdxProps = {
  children:
    | React.ReactElement<CodeBlockProps>
    | React.ReactElement<CodeBlockProps>[];
};

export function CodeGroupMdx({ children }: CodeGroupMdxProps) {
  const blocks = React.Children.toArray(
    children,
  ) as React.ReactElement<CodeBlockProps>[];

  return (
    <CodeGroup defaultValue={"0"}>
      <TabsList>
        {blocks.map((block, index) => (
          <TabsTrigger key={index} value={String(index)}>
            {(block.props.children as React.ReactElement<CodeBlockProps>)?.props
              ?.title ?? `Code ${index + 1}`}
          </TabsTrigger>
        ))}
      </TabsList>
      {blocks.map((block, index) => (
        <TabsContent key={index} value={String(index)}>
          <CodeBlock>
            {
              (block.props.children as React.ReactElement<CodeBlockProps>).props
                .children
            }
          </CodeBlock>
        </TabsContent>
      ))}
    </CodeGroup>
  );
}
