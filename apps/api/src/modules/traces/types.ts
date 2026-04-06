import { z } from "zod";

const TraceTimeRangeQuery = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const TraceListQuery = z.object({
  metadata: z.string().optional(),
  status: z.union([z.literal("ok"), z.literal("error")]).optional(),
  operation: z.union([z.literal("chat"), z.literal("embeddings")]).optional(),
  ...TraceTimeRangeQuery,
  page: z.coerce.number().default(1).optional(),
  pageSize: z.coerce.number().default(50).optional(),
});

const SpanStatus = z.union([z.literal("ok"), z.literal("error"), z.literal("unknown")]);

export const TraceListItem = z.object({
  timestamp: z.coerce.date(),
  traceId: z.string(),
  operationName: z.string(),
  model: z.string(),
  provider: z.string(),
  status: SpanStatus,
  statusMessage: z.string(),
  durationMs: z.number(),
  summary: z.string(),
  metadata: z.record(z.string(), z.string()),
});

export const TraceListResponse = z.object({
  data: z.array(TraceListItem),
  hasNextPage: z.boolean(),
  metadataKeys: z.array(z.string()),
});

const SpanAttributes = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const GenericPart = z.object({ type: z.string() }).passthrough();

const TextPart = z.object({ type: z.literal("text"), content: z.string() }).passthrough();

const ReasoningPart = z
  .object({ type: z.literal("reasoning"), content: z.string() })
  .passthrough();

const ToolCallPart = z
  .object({
    type: z.literal("tool_call"),
    id: z.string().nullable().optional(),
    name: z.string(),
    arguments: z.any(),
  })
  .passthrough();

const ToolCallResponsePart = z
  .object({
    type: z.literal("tool_call_response"),
    id: z.string().nullable().optional(),
    response: z.any(),
  })
  .passthrough();

const GenAIMessagePart = z.union([
  TextPart,
  ReasoningPart,
  ToolCallPart,
  ToolCallResponsePart,
  GenericPart,
]);

const GenAIInputMessage = z
  .object({
    role: z.string(),
    name: z.string().nullable().optional(),
    content: z.union([z.string(), z.array(GenAIMessagePart), z.null()]).optional(),
    parts: z.array(GenAIMessagePart).optional(),
  })
  .passthrough();

const GenAIOutputMessage = z
  .object({
    role: z.string(),
    name: z.string().nullable().optional(),
    parts: z.array(GenAIMessagePart),
    finish_reason: z.string().optional(),
  })
  .passthrough();

const GenAIInputMessages = z.array(GenAIInputMessage);
const GenAIOutputMessages = z.array(GenAIOutputMessage);
const GenAIFinishReasons = z.array(z.string()).nullable();

export const SpanDetail = z.object({
  timestamp: z.coerce.date(),
  spanId: z.string(),
  operationName: z.string(),
  model: z.string(),
  responseModel: z.string(),
  provider: z.string(),
  status: SpanStatus,
  statusMessage: z.string(),
  durationMs: z.number(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
  cacheReadInputTokens: z.number().nullable(),
  reasoningTokens: z.number().nullable(),
  reasoningEffort: z.string(),
  reasoningEnabled: z.boolean().nullable(),
  reasoningMaxTokens: z.number().nullable(),
  inputMessages: GenAIInputMessages,
  outputMessages: GenAIOutputMessages,
  finishReasons: GenAIFinishReasons,
  responseId: z.string(),
  metadata: z.record(z.string(), z.string()),
  spanAttributes: SpanAttributes,
});

export type GenAIInputMessages = z.infer<typeof GenAIInputMessages>;
export type GenAIOutputMessages = z.infer<typeof GenAIOutputMessages>;
export type GenAIFinishReasons = z.infer<typeof GenAIFinishReasons>;
