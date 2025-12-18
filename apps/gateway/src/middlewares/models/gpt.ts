import type {
  OpenAICompatibleOptions,
  OpenAICompatibleReasoning,
} from "~gateway/utils/openai-compatible-api-schemas";

import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export abstract class GptModelAdapter extends ModelAdapterBase {
  readonly modality = "chat";

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const { "openai-compatible": openAiOptions, ...rest } = options || {};

    if (!openAiOptions) return rest;

    const config: Record<string, any> = {};
    const reasoning = (openAiOptions as any)
      ?.reasoning as OpenAICompatibleReasoning;

    if (reasoning) {
      const reasoningConfig = this.transformReasoning(reasoning);
      if (reasoningConfig) {
        Object.assign(config, reasoningConfig);
      }
    }

    return {
      ...rest,
      "openai-compatible": config,
    };
  }

  private transformReasoning(
    params: OpenAICompatibleReasoning,
  ): Record<string, any> | undefined {
    if (params.max_tokens !== undefined) {
      throw new Error("GPT models do not support 'max_tokens' for reasoning.");
    }
    if (params.exclude !== undefined) {
      throw new Error("GPT models do not support 'exclude' for reasoning.");
    }

    const isReasoningActive =
      params.enabled === true ||
      (params.enabled === undefined && params.effort !== undefined);

    if (isReasoningActive) {
      return {
        reasoningEffort: params.effort || "medium",
      };
    }

    return undefined;
  }
}

export class GptOss120bAdapter extends GptModelAdapter {
  readonly id = "openai/gpt-oss-120b";
  readonly name = "OpenAI GPT OSS 120B";
  readonly owned_by = "openai";
  readonly created = 1_764_888_221;
  readonly pricing = {
    monthly_free_tokens: 100_000_000,
  };
}

export class GptOss20bAdapter extends GptModelAdapter {
  readonly id = "openai/gpt-oss-20b";
  readonly name = "OpenAI GPT OSS 20B";
  readonly owned_by = "openai";
  readonly created = 1_764_888_221;
  readonly pricing = {
    monthly_free_tokens: 400_000_000,
  };
}
