"use client";

import { Brain } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "../_shadcn/ui/trace";
import { ChatMarkdown } from "./chat-markdown";

export function ChatReasoning({
  children,
  isStreaming,
}: {
  children: string;
  isStreaming: boolean;
}) {
  const [open, setOpen] = useState<boolean>();
  const [duration, setDuration] = useState<number>();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (isStreaming) {
      startedAt.current ??= Date.now();
    } else if (startedAt.current !== null) {
      setDuration(Math.ceil((Date.now() - startedAt.current) / 1000));
      startedAt.current = null;
    }
  }, [isStreaming]);

  const line = (
    <TraceLine status={isStreaming ? "running" : undefined}>
      <TraceIcon>
        <Brain />
      </TraceIcon>
      <TraceTitle>
        {isStreaming ? "Thinking" : duration === undefined ? "Thought" : `Thought for ${duration}s`}
      </TraceTitle>
    </TraceLine>
  );

  return (
    <Trace className="mb-4">
      {children.length === 0 ? (
        line
      ) : (
        <TraceCollapsible open={open ?? isStreaming} onOpenChange={setOpen}>
          <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
          <TraceCollapsibleContent className="text-sm">
            <ChatMarkdown>{children}</ChatMarkdown>
          </TraceCollapsibleContent>
        </TraceCollapsible>
      )}
    </Trace>
  );
}
