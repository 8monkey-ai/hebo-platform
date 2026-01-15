import { generateText, streamText, type ModelMessage } from "ai";
import { Elysia, t } from "elysia";

import { aiModelFactory } from "~gateway/middlewares/ai-model-factory";
import {
  toModelMessages,
  toOpenAICompatibleNonStreamResponse,
  toOpenAICompatibleStream,
  toToolChoice,
  toToolSet,
} from "~gateway/utils/converters";
import {
  OpenAICompatibleMessage,
  OpenAICompatibleTool,
  OpenAICompatibleToolChoice,
  OpenAICompatibleReasoning,
  OpenAICompatibleReasoningEffort,
} from "~gateway/utils/openai-compatible-api-schemas";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export const completions = new Elysia({
  name: "completions",
  prefix: "/chat/completions",
})
  .use(aiModelFactory)
  .post(
    "/",
    async ({ body, aiModelFactory }) => {
      const {
        model: modelAliasPath,
        messages,
        tools,
        tool_choice,
        reasoning,
        reasoning_effort,
        temperature = 1,
        stream = false,
      } = body;
      const chatModel = await aiModelFactory.create(modelAliasPath, "chat");

      const toolSet = toToolSet(tools);
      const modelMessages = toModelMessages(messages);
      const coreToolChoice = toToolChoice(tool_choice);

      const providerOptions: ProviderOptions = {};
      if (reasoning) {
        providerOptions.reasoning = reasoning;
      } else if (reasoning_effort) {
        providerOptions.reasoning = {
          effort: reasoning_effort,
          enabled: true,
        };
      }

      if (stream) {
        const result = streamText({
          model: chatModel,
          messages: modelMessages as ModelMessage[],
          tools: toolSet,
          toolChoice: coreToolChoice,
          temperature,
          providerOptions,
        });

        const responseStream = toOpenAICompatibleStream(result, modelAliasPath);

        return new Response(responseStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      const result = await generateText({
        model: chatModel,
        messages: modelMessages as ModelMessage[],
        tools: toolSet,
        toolChoice: coreToolChoice,
        temperature,
        providerOptions,
      });

      return toOpenAICompatibleNonStreamResponse(result, modelAliasPath);
    },
    {
      body: t.Object({
        model: t.String(),
        messages: t.Array(OpenAICompatibleMessage),
        temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
        stream: t.Optional(t.Boolean()),
        tools: t.Optional(t.Array(OpenAICompatibleTool)),
        tool_choice: t.Optional(OpenAICompatibleToolChoice),
        reasoning: t.Optional(OpenAICompatibleReasoning),
        reasoning_effort: t.Optional(OpenAICompatibleReasoningEffort),
      }),
    },
  );
