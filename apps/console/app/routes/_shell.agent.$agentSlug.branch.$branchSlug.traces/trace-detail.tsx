import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@hebo/shared-ui/components/Tabs";

import {
  formatDuration,
  formatOperationName,
  formatStatus,
  formatTokens,
  parseJsonSafe,
} from "./utils";

type TraceRow = {
  timestamp: string;
  duration_nano: number;
  trace_id: string;
  span_id: string;
  span_name: string;
  span_status_code: string;
  operation_name: string | null;
  request_model: string | null;
  response_model: string | null;
  provider_name: string | null;
  input_messages: unknown;
  output_messages: unknown;
  response_id: string | null;
  finish_reasons: unknown;
  total_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_output_tokens: number | null;
};

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      <span className="truncate max-w-[180px]">{value}</span>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

function ExpandableSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground min-w-[120px] shrink-0">{label}</span>
      <span className="text-foreground break-all">{value ?? "—"}</span>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = content.length > 400 && !expanded;
  const displayContent = truncated ? `${content.slice(0, 400)}…` : content;

  const roleColors: Record<string, string> = {
    system: "border-l-blue-500/50 bg-blue-500/5",
    user: "border-l-green-500/50 bg-green-500/5",
    assistant: "border-l-purple-500/50 bg-purple-500/5",
    tool: "border-l-amber-500/50 bg-amber-500/5",
  };

  return (
    <div
      className={`border-l-2 rounded-r-md p-3 ${roleColors[role] ?? "border-l-gray-500/50 bg-gray-500/5"}`}
    >
      <div className="mb-1">
        <Badge variant="outline" className="text-xs capitalize">
          {role}
        </Badge>
      </div>
      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">{displayContent}</pre>
      {content.length > 400 && (
        <button
          type="button"
          className="mt-1 text-xs text-primary hover:underline cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ToolCallBlock({ toolCall }: { toolCall: { name: string; arguments: string } }) {
  const [expanded, setExpanded] = useState(false);

  let argsDisplay: string;
  try {
    const parsed = JSON.parse(toolCall.arguments);
    argsDisplay = JSON.stringify(parsed, null, 2);
  } catch {
    argsDisplay = toolCall.arguments;
  }

  const isLong = argsDisplay.length > 200;
  const displayArgs = isLong && !expanded ? `${argsDisplay.slice(0, 200)}…` : argsDisplay;

  return (
    <div className="border-l-2 border-l-amber-500/50 bg-amber-500/5 rounded-r-md p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">🔧</span>
        <code className="text-sm font-semibold">{toolCall.name}</code>
      </div>
      <pre className="whitespace-pre-wrap text-xs font-mono text-muted-foreground leading-relaxed">
        {displayArgs}
      </pre>
      {isLong && (
        <button
          type="button"
          className="mt-1 text-xs text-primary hover:underline cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function renderMessages(messages: unknown) {
  const parsed = parseJsonSafe(messages);
  if (!Array.isArray(parsed)) return null;

  return (
    <div className="flex flex-col gap-2">
      {parsed.map((msg: { role?: string; content?: string; tool_calls?: unknown[] }, i: number) => {
        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
          return (
            <div key={i} className="flex flex-col gap-2">
              {msg.content && <MessageBubble role={msg.role ?? "assistant"} content={msg.content} />}
              {msg.tool_calls.map(
                (tc: { function?: { name: string; arguments: string } }, j: number) =>
                  tc.function && <ToolCallBlock key={j} toolCall={tc.function} />,
              )}
            </div>
          );
        }

        const content =
          typeof msg.content === "string"
            ? msg.content
            : typeof msg.content === "object"
              ? JSON.stringify(msg.content, null, 2)
              : String(msg.content ?? "");

        return <MessageBubble key={i} role={msg.role ?? "unknown"} content={content} />;
      })}
    </div>
  );
}

export function TraceDetail({
  trace,
  onClose,
}: {
  trace: TraceRow;
  onClose: () => void;
}) {
  const statusInfo = formatStatus(trace.span_status_code);
  const finishReasons = parseJsonSafe(trace.finish_reasons);

  const rawJson = {
    timestamp: trace.timestamp,
    duration_nano: trace.duration_nano,
    trace_id: trace.trace_id,
    span_id: trace.span_id,
    span_name: trace.span_name,
    span_status_code: trace.span_status_code,
    "gen_ai.operation.name": trace.operation_name,
    "gen_ai.request.model": trace.request_model,
    "gen_ai.response.model": trace.response_model,
    "gen_ai.provider.name": trace.provider_name,
    "gen_ai.response.id": trace.response_id,
    "gen_ai.response.finish_reasons": finishReasons,
    "gen_ai.usage.input_tokens": trace.input_tokens,
    "gen_ai.usage.output_tokens": trace.output_tokens,
    "gen_ai.usage.total_tokens": trace.total_tokens,
    "gen_ai.usage.reasoning.output_tokens": trace.reasoning_output_tokens,
    "gen_ai.input.messages": parseJsonSafe(trace.input_messages),
    "gen_ai.output.messages": parseJsonSafe(trace.output_messages),
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-medium truncate">
            {formatOperationName(trace.operation_name ?? trace.span_name)}
          </h2>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <Tabs defaultValue="formatted" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="formatted">Formatted</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="formatted" className="flex-1 overflow-y-auto">
          <div className="divide-y">
            {/* Overview */}
            <ExpandableSection title="Overview" defaultOpen>
              <div className="space-y-0.5">
                <FieldRow label="Operation" value={formatOperationName(trace.operation_name ?? trace.span_name)} />
                <FieldRow label="Model" value={trace.response_model ?? trace.request_model} />
                <FieldRow label="Provider" value={trace.provider_name} />
                <FieldRow label="Duration" value={formatDuration(trace.duration_nano)} />
                <FieldRow
                  label="Status"
                  value={<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
                />
                {finishReasons && (
                  <FieldRow
                    label="Finish Reason"
                    value={
                      Array.isArray(finishReasons)
                        ? finishReasons.join(", ")
                        : String(finishReasons)
                    }
                  />
                )}
              </div>
            </ExpandableSection>

            {/* Input */}
            {trace.input_messages && (
              <ExpandableSection title="Input" defaultOpen>
                {renderMessages(trace.input_messages) ?? (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                    {JSON.stringify(parseJsonSafe(trace.input_messages), null, 2)}
                  </pre>
                )}
              </ExpandableSection>
            )}

            {/* Output */}
            {trace.output_messages && (
              <ExpandableSection title="Output" defaultOpen>
                {renderMessages(trace.output_messages) ?? (
                  <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                    {JSON.stringify(parseJsonSafe(trace.output_messages), null, 2)}
                  </pre>
                )}
              </ExpandableSection>
            )}

            {/* Usage */}
            {(trace.input_tokens || trace.output_tokens || trace.total_tokens) && (
              <ExpandableSection title="Usage" defaultOpen>
                <div className="space-y-0.5">
                  <FieldRow label="Input Tokens" value={formatTokens(trace.input_tokens)} />
                  <FieldRow label="Output Tokens" value={formatTokens(trace.output_tokens)} />
                  {trace.reasoning_output_tokens != null && trace.reasoning_output_tokens > 0 && (
                    <FieldRow
                      label="Reasoning Tokens"
                      value={formatTokens(trace.reasoning_output_tokens)}
                    />
                  )}
                  <FieldRow label="Total Tokens" value={formatTokens(trace.total_tokens)} />
                </div>
              </ExpandableSection>
            )}

            {/* Identifiers */}
            <ExpandableSection title="Identifiers">
              <div className="space-y-0.5">
                <FieldRow label="Trace ID" value={<CopyValue value={trace.trace_id} />} />
                <FieldRow label="Span ID" value={<CopyValue value={trace.span_id} />} />
                {trace.response_id && (
                  <FieldRow label="Response ID" value={<CopyValue value={trace.response_id} />} />
                )}
                <FieldRow
                  label="Timestamp"
                  value={new Date(trace.timestamp).toLocaleString()}
                />
              </div>
            </ExpandableSection>
          </div>
        </TabsContent>

        <TabsContent value="raw" className="flex-1 overflow-y-auto">
          <div className="p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-lg p-4 overflow-x-auto">
              {JSON.stringify(rawJson, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
