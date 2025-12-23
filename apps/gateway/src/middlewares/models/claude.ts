import type { OpenAICompatibleReasoning } from "~gateway/utils/openai-compatible-api-schemas";

import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

const MAX_CLAUDE_TOKENS = 64_000;

export class ClaudeOpus45Adapter extends ModelAdapterBase {
  readonly id = "anthropic/claude-opus-4-5-v1";
  readonly name = "Anthropic Claude Opus 4.5";
  readonly owned_by = "anthropic";
  readonly created = 1_766_369_841;
  readonly modality = "chat";
  readonly pricing = {
    monthly_free_tokens: 0,
  };

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const modelConfig: Record<string, any> = {};

    if (options?.openaiCompatible) {
      const reasoning = (options.openaiCompatible as any)
        ?.reasoning as OpenAICompatibleReasoning;

      if (reasoning) {
        const thinkingConfig = this.transformReasoning(reasoning);
        if (thinkingConfig) {
          modelConfig.thinking = thinkingConfig;
        }
      }
    }

    if (Object.keys(modelConfig).length > 0) {
      return { ...options, modelConfig };
    }

    return options || {};
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
      const thinkingConfig: Record<string, any> = {
        type: "enabled",
      };

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
        case "minimal": {
          thinkingConfig.budgetTokens = Math.floor(MAX_CLAUDE_TOKENS * 0.1);
          break;
        }
        case "low": {
          thinkingConfig.budgetTokens = Math.floor(MAX_CLAUDE_TOKENS * 0.2);
          break;
        }
        case "medium": {
          thinkingConfig.budgetTokens = Math.floor(MAX_CLAUDE_TOKENS * 0.5);
          break;
        }
        case "high": {
          thinkingConfig.budgetTokens = Math.floor(MAX_CLAUDE_TOKENS * 0.8);
          break;
        }
        case "xhigh": {
          thinkingConfig.budgetTokens = Math.floor(MAX_CLAUDE_TOKENS * 0.95);
          break;
        }
        default: {
          thinkingConfig.budgetTokens = Math.floor(MAX_CLAUDE_TOKENS * 0.5);
          break;
        }
      }
    } else {
      thinkingConfig.budgetTokens = params.max_tokens;
    }

    if (thinkingConfig.budgetTokens < 1024) {
      thinkingConfig.budgetTokens = 1024;
    }

    return thinkingConfig;
  }
}
