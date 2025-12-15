import { ModelAdapterBase, type OpenAICompatibleOptions } from "./models";

import type { OpenAICompatibleReasoning } from "~gateway/utils/openai-compatible-api-schemas";

export abstract class GptModelAdapter extends ModelAdapterBase {
  getModality(): "chat" | "embedding" {
    return "chat";
  }

  transformConfigs(options: OpenAICompatibleOptions): Record<string, any> {
    const config: Record<string, any> = {};

    if (options.reasoning) {
      const reasoningConfig = this.transformReasoning(options.reasoning);
      if (reasoningConfig) {
        Object.assign(config, reasoningConfig);
      }
    }

    return config;
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
}

export class GptOss20bAdapter extends GptModelAdapter {
  getModelType(): string {
    return "openai/gpt-oss-20b";
  }

  getDisplayName(): string {
    return "OpenAI GPT OSS 20B";
  }
}
