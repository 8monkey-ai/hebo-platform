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
        <div className="bg-accent flex items-center justify-between gap-1 py-0.5 pr-1 pl-2">
          <span className="text-foreground text-sm font-medium">{title}</span>
          <CopyButton value={getNodeText(children)} className="" />
        </div>
      ) : (
        <CopyButton
          value={getNodeText(children)}
          className="bg-background absolute top-0 right-0 z-10 p-2.5"
        />
      )}
      <pre className="h-full w-full overflow-auto p-2 font-mono text-sm whitespace-pre">
        <code>{children}</code>
      </pre>
    </div>
  );
}

type CodeGroupProps = React.ComponentProps<typeof Tabs>;

const EVT = "codegroup:tab:change";

export function CodeGroup({ className, ...props }: CodeGroupProps) {
  const id = React.useId();
  const [value, setValue] = React.useState(props.defaultValue ?? "");

  React.useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      const has = !!document.querySelector(
        `#${CSS.escape(id)} [data-slot="tabs-trigger"][data-value="${CSS.escape(next)}"]`,
      );
      if (has) setValue(next);
    };

    globalThis.addEventListener(EVT, onChange);
    return () => globalThis.removeEventListener(EVT, onChange);
  }, []);

  return (
    <Tabs
      id={id}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        globalThis.dispatchEvent(new CustomEvent(EVT, { detail: next }));
      }}
      className={cn(
        "relative flex h-full w-full min-h-0 min-w-0 gap-0",
        "bg-accent overflow-hidden rounded-lg",
        "**:data-[slot=tabs-list]:py-1",
        "**:data-[slot=tabs-list]:bg-accent",
        "**:data-[slot=tabs-content]:min-h-0",
        "**:data-[slot=tabs-content]:overflow-hidden",
        "**:data-[slot=code-block]:static",
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

  const items = blocks.map((block, index) => {
    const inner = block.props?.children as
      | React.ReactElement<CodeBlockProps>
      | undefined;
    const title = inner?.props?.title ?? `Code ${index + 1}`;
    return {
      title,
      value: String(title),
      content: inner?.props?.children,
    };
  });

  return (
    <CodeGroup defaultValue={items[0]?.value}>
      <TabsList>
        {items.map(({ title, value }) => (
          <TabsTrigger key={value} value={value} data-value={value}>
            {title}
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map(({ value, content }) => (
        <TabsContent key={value} value={value}>
          <CodeBlock>{content}</CodeBlock>
        </TabsContent>
      ))}
    </CodeGroup>
  );
}
