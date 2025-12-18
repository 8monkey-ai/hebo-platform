import type {
  OpenAICompatibleOptions,
  OpenAICompatibleReasoning,
} from "~gateway/utils/openai-compatible-api-schemas";

import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export abstract class GeminiModelAdapter extends ModelAdapterBase {
  readonly modality = "chat";
  readonly owned_by = "google";
  readonly pricing = {
    monthly_free_tokens: 0,
  };

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const config: Record<string, any> = {};
    const openAiOptions = options as OpenAICompatibleOptions;

    if (openAiOptions?.["openai-compatible"]?.reasoning) {
      const thinkingConfig = this.transformReasoning(
        openAiOptions["openai-compatible"].reasoning,
      );
      if (thinkingConfig) {
        config.thinkingConfig = thinkingConfig;
      }
    }

    return {
      "openai-compatible": config,
    };
  }

  private transformReasoning(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> | undefined {
    const isReasoningActive =
      params.enabled === true ||
      (params.enabled === undefined &&
        (params.max_tokens !== undefined || params.effort !== undefined));

    if (isReasoningActive) {
      const thinkingConfig: Record<string, any> = {};

      thinkingConfig.includeThoughts =
        params.enabled !== false && params.exclude !== true;

      if (params.max_tokens === undefined) {
        switch (params.effort) {
          case "low": {
            thinkingConfig.thinkingBudget = 1024;
            break;
          }
          case "high": {
            thinkingConfig.thinkingBudget = 24_576;
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

    return undefined;
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

export class Gemini3ProPreviewAdapter extends GeminiModelAdapter {
  readonly id = "google/gemini-3-pro-preview";
  readonly name = "Gemini 3 Pro Preview";
  readonly created = 1_765_855_208;
}

export class Gemini3FlashPreviewAdapter extends GeminiModelAdapter {
  readonly id = "google/gemini-3-flash-preview";
  readonly name = "Gemini 3 Flash Preview";
  readonly created = 1_766_023_009;
}
