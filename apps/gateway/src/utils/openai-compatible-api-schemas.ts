import { t, type Static } from "elysia";

export const OpenAICompatibleContentPartImage = t.Object({
  type: t.Literal("image_url"),
  image_url: t.Object({
    url: t.String(),
    detail: t.Optional(
      t.Union([t.Literal("low"), t.Literal("high"), t.Literal("auto")]),
    ),
  }),
});

export const OpenAICompatibleContentPartText = t.Object({
  type: t.Literal("text"),
  text: t.String(),
});

export const OpenAICompatibleContentPartFile = t.Object({
  type: t.Literal("file"),
  file: t.Object({
    data: t.String(),
    media_type: t.String(),
    filename: t.String(),
  }),
});

export const OpenAICompatibleMessageToolCall = t.Object({
  type: t.Literal("function"),
  id: t.String(),
  function: t.Object({
    arguments: t.String(),
    name: t.String(),
  }),
  thought_signature: t.Optional(t.String()),
});

export const OpenAICompatibleSystemMessage = t.Object({
  role: t.Literal("system"),
  content: t.String(),
});

export const OpenAICompatibleUserMessage = t.Object({
  role: t.Literal("user"),
  content: t.Union([
    t.String(),
    t.Array(
      t.Union([
        OpenAICompatibleContentPartText,
        OpenAICompatibleContentPartImage,
        OpenAICompatibleContentPartFile,
      ]),
    ),
  ]),
});

export const OpenAICompatibleAssistantMessage = t.Object(
  {
    role: t.Literal("assistant"),
    content: t.Union([t.String(), t.Null()]),
    tool_calls: t.Optional(t.Array(OpenAICompatibleMessageToolCall)),
    reasoning: t.Optional(t.String()),
    reasoning_content: t.Optional(t.String()),
  },
  { additionalProperties: true },
);

export const OpenAICompatibleToolMessage = t.Object({
  role: t.Literal("tool"),
  content: t.String(),
  tool_call_id: t.String(),
});

export const OpenAICompatibleMessage = t.Union([
  OpenAICompatibleSystemMessage,
  OpenAICompatibleUserMessage,
  OpenAICompatibleAssistantMessage,
  OpenAICompatibleToolMessage,
]);

export const OpenAICompatibleTool = t.Object({
  type: t.Literal("function"),
  function: t.Object({
    name: t.String(),
    description: t.Optional(t.String()),
    parameters: t.Object({}, { additionalProperties: true }),
  }),
});

export const OpenAICompatibleToolChoice = t.Union([
  t.Literal("none"),
  t.Literal("auto"),
  t.Literal("required"),
  t.Object({
    type: t.Literal("function"),
    function: t.Object({
      name: t.String(),
    }),
  }),
]);

export const OpenAICompatibleFinishReason = t.Union([
  t.Literal("stop"),
  t.Literal("length"),
  t.Literal("content_filter"),
  t.Literal("tool_calls"),
]);

export const OpenAICompatibleReasoning = t.Object({
  enabled: t.Boolean(),
  max_tokens: t.Optional(t.Number()),
  effort: t.Optional(
    t.Union([
      t.Literal("none"),
      t.Literal("minimal"),
      t.Literal("low"),
      t.Literal("medium"),
      t.Literal("high"),
      t.Literal("xhigh"),
    ]),
  ),
  exclude: t.Optional(t.Boolean()),
});

export type OpenAICompatibleMessage = Static<typeof OpenAICompatibleMessage>;
export type OpenAICompatibleContentPart =
  | Static<typeof OpenAICompatibleContentPartText>
  | Static<typeof OpenAICompatibleContentPartImage>
  | Static<typeof OpenAICompatibleContentPartFile>;
export type OpenAICompatibleFinishReason = Static<
  typeof OpenAICompatibleFinishReason
>;
export type OpenAICompatibleReasoning = Static<
  typeof OpenAICompatibleReasoning
>;
export type OpenAICompatibleAssistantMessage = Static<
  typeof OpenAICompatibleAssistantMessage
>;
export type OpenAICompatibleTool = Static<typeof OpenAICompatibleTool>;
export type OpenAICompatibleToolChoice = Static<
  typeof OpenAICompatibleToolChoice
>;

export type OpenAICompatibleToolCallDelta = {
  id: string;
  index: number;
  type: "function";
  function: { name: string; arguments: string };
};

export const OpenAICompatibleConfig = t.Object(
  {
    reasoning: t.Optional(OpenAICompatibleReasoning),
  },
  { additionalProperties: true },
);

export type OpenAICompatibleConfig = Static<typeof OpenAICompatibleConfig>;

export const OpenAICompatibleOptions = t.Object(
  {
    openaiCompatible: t.Optional(OpenAICompatibleConfig),
  },
  { additionalProperties: true },
);

export type OpenAICompatibleOptions = Static<typeof OpenAICompatibleOptions>;
