import { ModelAdapterBase, type OpenAICompatibleOptions } from "../model-adapter";

import type { OpenAICompatibleReasoning } from "~gateway/utils/openai-compatible-api-schemas";

export abstract class GeminiModelAdapter extends ModelAdapterBase {
  getModality(): "chat" | "embedding" {
    return "chat";
  }

  transformConfigs(options: OpenAICompatibleOptions): Record<string, any> {
    const config: Record<string, any> = {};

    if (options.reasoning) {
      const thinkingConfig = this.transformReasoning(options.reasoning);
      if (thinkingConfig) {
        config.thinkingConfig = thinkingConfig;
      }
    }

    return config;
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

export class GeminiFlashPreviewAdapter extends GeminiModelAdapter {
  getModelType(): string {
    return "google/gemini-2.5-flash-preview-09-2025";
  }

  getDisplayName(): string {
    return "Gemini 2.5 Flash Preview (Sep 2025)";
  }
}

export class GeminiFlashLiteAdapter extends GeminiModelAdapter {
  getModelType(): string {
    return "google/gemini-2.5-flash-lite-preview-09-2025";
  }

  getDisplayName(): string {
    return "Gemini 2.5 Flash Lite Preview (Sep 2025)";
  }
}
