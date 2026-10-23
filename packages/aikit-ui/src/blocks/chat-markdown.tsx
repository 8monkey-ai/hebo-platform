"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";

import { cn } from "../lib/utils";

export type ChatMarkdownProps = ComponentProps<typeof Streamdown>;

const streamdownPlugins = { cjk, code, math, mermaid };

export const ChatMarkdown = ({ className, ...props }: ChatMarkdownProps) => (
  <Streamdown
    className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
    plugins={streamdownPlugins}
    {...props}
  />
);
