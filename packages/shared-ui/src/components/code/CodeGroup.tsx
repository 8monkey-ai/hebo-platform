"use client";

import { Tabs } from "@base-ui/react";
import { clsx } from "clsx";
import * as React from "react";

import { styles, type CodeBlockProps } from "./CodeBlock";
import { CopyButton } from "./CopyButton";
import { getNodeText } from "./utils/getNodeText";

export type CodeGroupPropsBase = {
  children?:
    | React.ReactElement<CodeBlockProps>[]
    | React.ReactElement<CodeBlockProps>;
};

export type CodeGroupProps = CodeGroupPropsBase &
  Omit<React.ComponentPropsWithoutRef<"div">, keyof CodeGroupPropsBase>;

/**
 * Group multiple code blocks into a tabbed UI.
 * Uses CodeBlocks as children but does not render them directly. Instead,
 * CodeGroup extracts the props and renders CodeBlock's children.
 *
 * @param {CodeBlock[]} - children
 */
export const CodeGroup = React.forwardRef(function CodeGroup(
  { children, className }: CodeGroupProps,
  ref: React.ForwardedRef<HTMLDivElement> | undefined,
) {
  const [activeTab, setActiveTab] = React.useState("0");

  if (children == undefined) {
    // Hide the frame when no children were passed
    console.warn(
      "CodeGroup has no children, expected at least one CodeBlock child.",
    );
    return;
  } else if (!Array.isArray(children)) {
    // Allow looping over a single child
    children = [children];
  } else if (children.length === 0) {
    return;
  }

  const childArr = React.Children.toArray(children) as Array<
    Exclude<React.ReactElement<CodeBlockProps>, boolean | null | undefined>
  >;

  return (
    <Tabs.Root
      ref={ref}
      value={activeTab}
      onValueChange={setActiveTab}
      className={clsx(styles.frame, className)}
    >
      <Tabs.List className={styles.header}>
        {childArr.map((child, tabIndex: number) => (
          <TabItem key={tabIndex.toString()} value={tabIndex.toString()}>
            {(child.props.children as React.ReactElement<{ title?: string }>)
              ?.props?.title ?? "Title Missing"}
          </TabItem>
        ))}
        <div className={clsx("flex flex-auto justify-end")}>
          <CopyButton
            value={getNodeText(
              childArr[Number.parseInt(activeTab)]?.props?.children,
            )}
            className={clsx("relative p-2")}
          />
        </div>
      </Tabs.List>
      {childArr.map((child, tabIndex: number) => (
        <Tabs.Panel
          key={tabIndex.toString()}
          value={tabIndex.toString()}
          tabIndex={-1}
        >
          <pre className={styles.code}>
            {
              (
                child.props.children as React.ReactElement<{
                  children?: React.ReactNode;
                }>
              ).props.children
            }
          </pre>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
});

interface TabItemProps {
  children: React.ReactNode;
  value: string;
}

function TabItem({ children, value }: TabItemProps) {
  return (
    <Tabs.Tab
      className="flex flex-none items-center border-b-2 text-sm data-selected:border-slate-500"
      value={value}
    >
      <span className="z-10">{children}</span>
    </Tabs.Tab>
  );
}
