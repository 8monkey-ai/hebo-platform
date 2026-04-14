import { z } from "zod";

const TraceTimeRangeQuerySchema = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const TraceListQuerySchema = z.object({
  metadata: z.string().optional(),
  status: z.union([z.literal("ok"), z.literal("error")]).optional(),
  operation: z.union([z.literal("chat"), z.literal("embeddings")]).optional(),
  ...TraceTimeRangeQuerySchema,
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
});

const SpanStatusSchema = z.union([z.literal("ok"), z.literal("error"), z.literal("unknown")]);

export const TraceListItemSchema = z.object({
  timestamp: z.coerce.date(),
  traceId: z.string(),
  operationName: z.string(),
  model: z.string(),
  provider: z.string(),
  status: SpanStatusSchema,
  statusMessage: z.string(),
  durationMs: z.number(),
  summary: z.string(),
  metadata: z.record(z.string(), z.string()),
});

export const TraceListResponseSchema = z.object({
  data: z.array(TraceListItemSchema),
  hasNextPage: z.boolean(),
  metadataKeys: z.array(z.string()),
});

const SpanAttributesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

const GenericPartSchema = z.object({ type: z.string() }).loose();

const TextPartSchema = z.object({ type: z.literal("text"), content: z.string() }).loose();

const ReasoningPartSchema = z.object({ type: z.literal("reasoning"), content: z.string() }).loose();

const ToolCallPartSchema = z
  .object({
    type: z.literal("tool_call"),
    id: z.string().nullable().optional(),
    name: z.string(),
    arguments: z.any(),
  })
  .loose();

const ToolCallResponsePartSchema = z
  .object({
    type: z.literal("tool_call_response"),
    id: z.string().nullable().optional(),
    response: z.any(),
  })
  .loose();

const GenAIMessagePartSchema = z.union([
  TextPartSchema,
  ReasoningPartSchema,
  ToolCallPartSchema,
  ToolCallResponsePartSchema,
  GenericPartSchema,
]);

const GenAIInputMessageSchema = z
  .object({
    role: z.string(),
    name: z.string().nullable().optional(),
    content: z.union([z.string(), z.array(GenAIMessagePartSchema), z.null()]).optional(),
    parts: z.array(GenAIMessagePartSchema).optional(),
  })
  .loose();

const GenAIOutputMessageSchema = z
  .object({
    role: z.string(),
    name: z.string().nullable().optional(),
    parts: z.array(GenAIMessagePartSchema),
    finish_reason: z.string().optional(),
  })
  .loose();

const GenAIInputMessagesSchema = z.array(GenAIInputMessageSchema);
const GenAIOutputMessagesSchema = z.array(GenAIOutputMessageSchema);
const GenAIFinishReasonsSchema = z.array(z.string()).nullable();

export const SpanDetailSchema = z.object({
  timestamp: z.coerce.date(),
  spanId: z.string(),
  operationName: z.string(),
  model: z.string(),
  responseModel: z.string(),
  provider: z.string(),
  status: SpanStatusSchema,
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
  inputMessages: GenAIInputMessagesSchema,
  outputMessages: GenAIOutputMessagesSchema,
  finishReasons: GenAIFinishReasonsSchema,
  responseId: z.string(),
  metadata: z.record(z.string(), z.string()),
  spanAttributes: SpanAttributesSchema,
});

export type GenAIInputMessagesSchema = z.infer<typeof GenAIInputMessagesSchema>;
export type GenAIOutputMessagesSchema = z.infer<typeof GenAIOutputMessagesSchema>;
export type GenAIFinishReasonsSchema = z.infer<typeof GenAIFinishReasonsSchema>;
