import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { CodeBlock } from "@hebo/shared-ui/components/Code";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hebo/shared-ui/components/Sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";

import { formatDuration, formatOperationName, formatTokenCount, truncateText } from "./utils";

type TraceDetailData = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  provider: string;
  statusCode: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  inputMessages?: unknown;
  outputContent?: unknown;
  toolCalls?: unknown;
  toolDefinitions?: unknown;
  requestMetadata: Record<string, string>;
  rawAttributes: Record<string, unknown>;
};

type TraceDetailProps = {
  trace: TraceDetailData | null;
  open: boolean;
  onClose: () => void;
};

export function TraceDetailPanel({ trace, open, onClose }: TraceDetailProps) {
  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-xl lg:max-w-2xl"
      >
        {trace && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {formatOperationName(trace.operationName)}
                <StatusBadge code={trace.statusCode} />
              </SheetTitle>
              <SheetDescription>
                {trace.model} · {formatDuration(trace.durationMs)}
              </SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="formatted" className="px-4 pb-4">
              <TabsList>
                <TabsTrigger value="formatted">Formatted</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="formatted">
                <FormattedView trace={trace} />
              </TabsContent>

              <TabsContent value="raw">
                <CodeBlock title="Span Attributes">
                  {JSON.stringify(trace.rawAttributes, null, 2)}
                </CodeBlock>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ code }: { code: number }) {
  if (code === 0 || code === 1) {
    return <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">OK</Badge>;
  }
  return <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50">Error</Badge>;
}

function FormattedView({ trace }: { trace: TraceDetailData }) {
  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* 1. Overview */}
      <Section title="Overview">
        <FieldGrid>
          <Field label="Operation" value={formatOperationName(trace.operationName)} />
          <Field label="Model" value={trace.model} />
          {trace.provider && <Field label="Provider" value={trace.provider} />}
          <Field label="Duration" value={formatDuration(trace.durationMs)} />
          <Field label="Status" value={trace.statusCode <= 1 ? "OK" : "Error"} />
          {trace.finishReason && <Field label="Finish Reason" value={trace.finishReason} />}
        </FieldGrid>
      </Section>

      {/* 2. Input */}
      {trace.inputMessages && (
        <Section title="Input">
          <MessageList messages={trace.inputMessages} />
        </Section>
      )}

      {/* 3. Output */}
      {(trace.outputContent || trace.toolCalls) && (
        <Section title="Output">
          <OutputView
            content={trace.outputContent}
            toolCalls={trace.toolCalls}
          />
        </Section>
      )}

      {/* 4. Usage */}
      {(trace.inputTokens !== undefined || trace.outputTokens !== undefined) && (
        <Section title="Usage">
          <FieldGrid>
            {trace.inputTokens !== undefined && (
              <Field label="Input Tokens" value={formatTokenCount(trace.inputTokens)} />
            )}
            {trace.outputTokens !== undefined && (
              <Field label="Output Tokens" value={formatTokenCount(trace.outputTokens)} />
            )}
            {trace.totalTokens !== undefined && (
              <Field label="Total Tokens" value={formatTokenCount(trace.totalTokens)} />
            )}
          </FieldGrid>
        </Section>
      )}

      {/* 5. Request Metadata */}
      {Object.keys(trace.requestMetadata).length > 0 && (
        <Section title="Request Metadata">
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(trace.requestMetadata).map(([key, value]) => (
                  <tr key={key} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 font-medium text-muted-foreground">{key}</td>
                    <td className="px-3 py-1.5">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 6. Identifiers */}
      <Section title="Identifiers">
        <FieldGrid>
          <FieldWithCopy label="Trace ID" value={trace.traceId} />
          <FieldWithCopy label="Span ID" value={trace.spanId} />
        </FieldGrid>
      </Section>

      {/* Tool Definitions (collapsed by default) */}
      {trace.toolDefinitions && (
        <ToolDefinitions definitions={trace.toolDefinitions} />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </h4>
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function FieldWithCopy({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2 sm:col-span-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <code className="text-xs font-mono">{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

// Chat-style message rendering
function MessageList({ messages }: { messages: unknown }) {
  const msgs = normalizeMessages(messages);
  if (msgs.length === 0) {
    return <pre className="text-xs text-muted-foreground">{JSON.stringify(messages, null, 2)}</pre>;
  }

  return (
    <div className="flex flex-col gap-2">
      {msgs.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}
    </div>
  );
}

type NormalizedMessage = {
  role: string;
  content: string;
  toolCallId?: string;
  name?: string;
};

function normalizeMessages(input: unknown): NormalizedMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m) => {
      if (typeof m !== "object" || !m) return null;
      const obj = m as Record<string, unknown>;
      const role = String(obj.role ?? "unknown");
      let content = "";

      if (typeof obj.content === "string") {
        content = obj.content;
      } else if (Array.isArray(obj.content)) {
        content = obj.content
          .map((part: unknown) => {
            if (typeof part === "string") return part;
            if (typeof part === "object" && part && "text" in part) return String((part as { text: unknown }).text);
            if (typeof part === "object" && part && "type" in part && (part as { type: unknown }).type === "image_url")
              return "[image]";
            return JSON.stringify(part);
          })
          .join("\n");
      } else if (obj.content) {
        content = JSON.stringify(obj.content);
      }

      return {
        role,
        content,
        toolCallId: obj.tool_call_id as string | undefined,
        name: obj.name as string | undefined,
      };
    })
    .filter((m): m is NormalizedMessage => m !== null);
}

function MessageBubble({ message }: { message: NormalizedMessage }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = message.content.length > 300;
  const displayContent = isLong && !expanded ? truncateText(message.content, 300) : message.content;

  const roleStyles: Record<string, string> = {
    system: "border-l-purple-400 bg-purple-50/50 dark:bg-purple-950/20",
    user: "border-l-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
    assistant: "border-l-green-400 bg-green-50/50 dark:bg-green-950/20",
    tool: "border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
  };

  const roleLabels: Record<string, string> = {
    system: "System",
    user: "User",
    assistant: "Assistant",
    tool: "Tool Result",
  };

  return (
    <div className={`rounded-md border-l-2 px-3 py-2 text-sm ${roleStyles[message.role] ?? "border-l-gray-400"}`}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {roleLabels[message.role] ?? message.role}
        </span>
        {message.name && (
          <span className="text-xs text-muted-foreground">({message.name})</span>
        )}
        {message.toolCallId && (
          <code className="text-xs text-muted-foreground">{message.toolCallId}</code>
        )}
      </div>
      <div className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
        {displayContent}
        {isLong && !expanded && "…"}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

// Simplified tool call rendering - conversation style
function OutputView({
  content,
  toolCalls,
}: {
  content: unknown;
  toolCalls: unknown;
}) {
  const calls = normalizeToolCalls(toolCalls);
  const textContent = typeof content === "string" ? content : content ? JSON.stringify(content) : null;

  return (
    <div className="flex flex-col gap-2">
      {calls.map((call, i) => (
        <ToolCallItem key={i} call={call} />
      ))}

      {textContent && (
        <CollapsibleContent
          icon="💬"
          label=""
          content={textContent}
        />
      )}
    </div>
  );
}

type NormalizedToolCall = {
  name: string;
  arguments: string;
  result?: string;
  id?: string;
};

function normalizeToolCalls(input: unknown): NormalizedToolCall[] {
  if (!Array.isArray(input)) return [];
  return input.map((tc) => {
    if (typeof tc !== "object" || !tc) return { name: "unknown", arguments: "" };
    const obj = tc as Record<string, unknown>;
    const fn = (obj.function ?? obj) as Record<string, unknown>;
    return {
      name: String(fn.name ?? obj.name ?? "unknown"),
      arguments: typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? obj.arguments ?? {}),
      result: obj.result ? String(obj.result) : undefined,
      id: obj.id ? String(obj.id) : undefined,
    };
  });
}

function ToolCallItem({ call }: { call: NormalizedToolCall }) {
  const [expanded, setExpanded] = useState(false);

  // Format arguments as inline signature for short args
  let argsPreview: string;
  try {
    const parsed = JSON.parse(call.arguments);
    const entries = Object.entries(parsed);
    if (entries.length <= 3 && call.arguments.length < 100) {
      argsPreview = entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ");
    } else {
      argsPreview = call.arguments.length > 80 ? truncateText(call.arguments, 80) + "…" : call.arguments;
    }
  } catch {
    argsPreview = call.arguments.length > 80 ? truncateText(call.arguments, 80) + "…" : call.arguments;
  }

  const needsExpand = call.arguments.length > 100 || (call.result && call.result.length > 100);

  return (
    <div className="rounded-md border bg-amber-50/50 px-3 py-2 dark:bg-amber-950/20">
      <div className="flex items-start gap-1.5">
        <Wrench className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <span className="font-mono text-sm font-medium">{call.name}</span>
          <span className="font-mono text-xs text-muted-foreground">({argsPreview})</span>
          {call.result && (
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              → {expanded || call.result.length <= 100
                ? call.result
                : truncateText(call.result, 100) + "…"}
            </div>
          )}
        </div>
        {needsExpand && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-2 space-y-2">
          <CodeBlock title="Arguments">
            {formatJson(call.arguments)}
          </CodeBlock>
          {call.result && (
            <CodeBlock title="Result">
              {formatJson(call.result)}
            </CodeBlock>
          )}
        </div>
      )}
    </div>
  );
}

function CollapsibleContent({
  icon,
  label,
  content,
}: {
  icon: string;
  label: string;
  content: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 300;
  const displayContent = isLong && !expanded ? truncateText(content, 300) + "…" : content;

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm">
      {label && (
        <span className="mr-1.5">
          {icon} {label}
        </span>
      )}
      <div className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
        {icon && !label ? `${icon} ` : ""}{displayContent}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ToolDefinitions({ definitions }: { definitions: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const tools = Array.isArray(definitions) ? definitions : [];
  if (tools.length === 0) return null;

  const toolNames = tools.map((t) => {
    if (typeof t === "object" && t) {
      const obj = t as Record<string, unknown>;
      const fn = (obj.function ?? obj) as Record<string, unknown>;
      return String(fn.name ?? obj.name ?? "unknown");
    }
    return "unknown";
  });

  return (
    <Section title="Tools">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {tools.length} available: {toolNames.join(", ")}
      </button>
      {expanded && (
        <div className="mt-2">
          <CodeBlock title="Tool Definitions">
            {JSON.stringify(definitions, null, 2)}
          </CodeBlock>
        </div>
      )}
    </Section>
  );
}

function formatJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}
