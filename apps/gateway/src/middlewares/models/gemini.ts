import type { OpenAICompatibleReasoning } from "~gateway/utils/openai-compatible-api-schemas";

import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export abstract class GeminiModelAdapter extends ModelAdapterBase {
  readonly modality = "chat";
  readonly owned_by = "google";
  readonly pricing = {
    monthly_free_tokens: 0,
  };

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const { openaiCompatible: openAiOptions, ...rest } = options || {};

    if (!openAiOptions) return rest;

    const config: Record<string, any> = {};
    const reasoning = (openAiOptions as any)
      ?.reasoning as OpenAICompatibleReasoning;

    if (reasoning) {
      const thinkingConfig = this.transformReasoning(reasoning);
      if (thinkingConfig) {
        config.thinkingConfig = thinkingConfig;
      }
    }

    return {
      ...rest,
      openaiCompatible: config,
    };
  }

  protected transformReasoning(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> | undefined {
    const isReasoningActive =
      (params.enabled === true ||
        (params.enabled === undefined &&
          (params.max_tokens !== undefined || params.effort !== undefined))) &&
      params.effort !== "none";

    if (isReasoningActive) {
      const thinkingConfig: Record<string, any> = {};

      thinkingConfig.includeThoughts =
        params.enabled !== false && params.exclude !== true;

      const specificConfig = this.getThinkingConfig(params);
      Object.assign(thinkingConfig, specificConfig);

      return thinkingConfig;
    }

    return undefined;
  }

  protected getThinkingConfig(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> {
    const thinkingConfig: Record<string, any> = {};

    if (params.max_tokens === undefined) {
      switch (params.effort) {
        case "minimal":
        case "low": {
          thinkingConfig.thinkingBudget = 1024;
          break;
        }
        case "high": {
          thinkingConfig.thinkingBudget = 24_576;
          break;
        }
        case "xhigh": {
          thinkingConfig.thinkingBudget = 32_768; // assuming
          break;
        }
        default: {
          thinkingConfig.thinkingBudget = 8192;
          break;
        }
      }
    } else {
      thinkingConfig.thinkingBudget = params.max_tokens;
    }

    return thinkingConfig;
  }
}

export abstract class Gemini3ModelAdapter extends GeminiModelAdapter {
  transformPrompt(prompt: any): any {
    return prompt.map((message: any) => {
      if (message.role === "assistant" && Array.isArray(message.content)) {
        let hasInjected = false;
        return {
          ...message,
          content: message.content.map((part: any) => {
            if (part.type === "tool-call") {
              if (hasInjected) {
                return part;
              }

              const existingSignature = (part as any).providerOptions
                ?.openaiCompatible?.thoughtSignature;

              if (existingSignature) {
                hasInjected = true;
                return part;
              }

              hasInjected = true;
              return {
                ...part,
                providerOptions: {
                  ...(part as any).providerOptions,
                  google: {
                    ...(part as any).providerOptions?.google,
                    thoughtSignature: "context_engineering_is_the_way_to_go",
                  },
                },
              };
            }
            return part;
          }),
        };
      }
      return message;
    });
  }
}

export class Gemini25FlashPreviewAdapter extends GeminiModelAdapter {
  readonly id = "google/gemini-2.5-flash-preview-09-2025";
  readonly name = "Gemini 2.5 Flash Preview (Sep 2025)";
  readonly created = 1_764_888_221;
}

export class Gemini25FlashLitePreviewAdapter extends GeminiModelAdapter {
  readonly id = "google/gemini-2.5-flash-lite-preview-09-2025";
  readonly name = "Gemini 2.5 Flash Lite Preview (Sep 2025)";
  readonly created = 1_764_888_221;
}

export class Gemini3ProPreviewAdapter extends Gemini3ModelAdapter {
  readonly id = "google/gemini-3-pro-preview";
  readonly name = "Gemini 3 Pro Preview";
  readonly created = 1_765_855_208;

  protected getThinkingConfig(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> {
    const thinkingConfig: Record<string, any> = {};

    switch (params.effort) {
      case "minimal":
      case "low": {
        thinkingConfig.thinkingLevel = "low";
        break;
      }
      case "medium": {
        thinkingConfig.thinkingLevel = "high";
        break;
      }
      case "high":
      case "xhigh": {
        thinkingConfig.thinkingLevel = "high";
        break;
      }
      default: {
        thinkingConfig.thinkingLevel = "high";
        break;
      }
    }

    return thinkingConfig;
  }
}

export class Gemini3FlashPreviewAdapter extends Gemini3ModelAdapter {
  readonly id = "google/gemini-3-flash-preview";
  readonly name = "Gemini 3 Flash Preview";
  readonly created = 1_766_023_009;

  protected getThinkingConfig(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> {
    const thinkingConfig: Record<string, any> = {};

    switch (params.effort) {
      case "minimal": {
        thinkingConfig.thinkingLevel = "minimal";
        break;
      }
      case "low": {
        thinkingConfig.thinkingLevel = "low";
        break;
      }
      case "medium": {
        thinkingConfig.thinkingLevel = "medium";
        break;
      }
      case "high":
      case "xhigh": {
        thinkingConfig.thinkingLevel = "high";
        break;
      }
      default: {
        thinkingConfig.thinkingLevel = "medium";
        break;
      }
    }

    return thinkingConfig;
  }
}
