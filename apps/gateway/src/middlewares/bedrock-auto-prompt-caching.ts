import type { LanguageModelV3Middleware } from "@ai-sdk/provider";
import { modelMiddlewareMatcher } from "@hebo-ai/gateway";

/**
 * Places a Bedrock cache point on the turn right before the last user message,
 * caching the full reusable prefix (system prompt + conversation history).
 *
 * @see https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html
 */
export const autoPromptCachingMiddleware: LanguageModelV3Middleware = {
  specificationVersion: "v3",

  transformParams: async ({ params }) => {
    const { prompt } = params;

    for (let i = prompt.length - 1; i > 0; i--) {
      if (prompt[i].role !== "user") continue;

      const target = prompt[i - 1];
      const bedrock = ((target.providerOptions ??= {})["bedrock"] ??= {});
      bedrock["cachePoint"] = { type: "default" };
      break;
    }

    return params;
  },
};

modelMiddlewareMatcher.useForProvider("amazon-bedrock", {
  language: [autoPromptCachingMiddleware],
});
