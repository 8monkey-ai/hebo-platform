import { BadRequestError } from "@hebo/shared-api/errors";

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
    const transformed: Record<string, any> = {};

    if (options?.reasoning) {
      const thinkingConfig = this.transformReasoning(options.reasoning);
      if (thinkingConfig) {
        transformed.thinkingConfig = thinkingConfig;
      }
    }

    return Object.keys(transformed).length > 0 ? transformed : options;
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
        case "medium": {
          thinkingConfig.thinkingBudget = 8192;
          break;
        }
        case "high":
        case "xhigh": {
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
}

export abstract class Gemini3ModelAdapter extends GeminiModelAdapter {}

export class Gemini3ProPreviewAdapter extends Gemini3ModelAdapter {
  readonly id = "google/gemini-3-pro-preview";
  readonly name = "Gemini 3 Pro Preview";
  readonly created = 1_765_855_208;

  protected getThinkingConfig(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> {
    if (params.max_tokens !== undefined) {
      throw new BadRequestError(
        "max_tokens is not supported for reasoning in Gemini 3 models. Please use 'effort' instead.",
      );
    }
    const thinkingConfig: Record<string, any> = {};

    switch (params.effort) {
      case "minimal":
      case "low": {
        thinkingConfig.thinkingLevel = "low";
        break;
      }
      case "medium":
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
    if (params.max_tokens !== undefined) {
      throw new BadRequestError(
        "max_tokens is not supported for reasoning in Gemini 3 models. Please use 'effort' instead.",
      );
    }
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
