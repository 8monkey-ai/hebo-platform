import type {
  OpenAICompatibleOptions,
  OpenAICompatibleReasoning,
} from "~gateway/utils/openai-compatible-api-schemas";

import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export abstract class GptModelAdapter extends ModelAdapterBase {
  getModality(): "chat" | "embedding" {
    return "chat";
  }

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const config: Record<string, any> = {};
    const openAiOptions = options as OpenAICompatibleOptions;

    if (openAiOptions?.["openai-compatible"]?.reasoning) {
      const reasoningConfig = this.transformReasoning(
        openAiOptions["openai-compatible"].reasoning,
      );
      if (reasoningConfig) {
        Object.assign(config, reasoningConfig);
      }
    }

    return {
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
  getModelType(): string {
    return "openai/gpt-oss-120b";
  }

  getDisplayName(): string {
    return "OpenAI GPT OSS 120B";
  }

  getOwner(): string {
    return "openai";
  }

  getCreatedAt(): number {
    return 1_764_888_221;
  }

  getMonthlyFreeTokens(): number {
    return 100_000_000;
  }
}

export class GptOss20bAdapter extends GptModelAdapter {
  getModelType(): string {
    return "openai/gpt-oss-20b";
  }

  getDisplayName(): string {
    return "OpenAI GPT OSS 20B";
  }

  getOwner(): string {
    return "openai";
  }

  getCreatedAt(): number {
    return 1_764_888_221;
  }

  getMonthlyFreeTokens(): number {
    return 400_000_000;
  }
}
