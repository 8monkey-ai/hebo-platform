"use client";

import { Brain } from "lucide-react";
import { useState } from "react";

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "../_shadcn/ui/trace";

export function ChatReasoning({
  children,
  isStreaming,
}: {
  children: string;
  isStreaming: boolean;
}) {
  const [open, setOpen] = useState<boolean>();

  const line = (
    <TraceLine status={isStreaming ? "running" : undefined}>
      <TraceIcon>
        <Brain />
      </TraceIcon>
      <TraceTitle>{isStreaming ? "Thinking" : "Thought"}</TraceTitle>
    </TraceLine>
  );

  return (
    <Trace className="mb-4">
      {children.length === 0 ? (
        line
      ) : (
        <TraceCollapsible open={open ?? isStreaming} onOpenChange={setOpen}>
          <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="text-sm whitespace-pre-wrap">
            {children}
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
    </Trace>
  );
}
