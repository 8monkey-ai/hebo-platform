import { BadRequestError } from "@hebo/shared-api/errors";

import type { OpenAICompatibleReasoning } from "~gateway/utils/openai-compatible-api-schemas";

import { ModelAdapterBase } from "./model";

import type {
  LanguageModelV2Prompt,
  SharedV2ProviderMetadata,
  SharedV2ProviderOptions,
  JSONValue,
} from "@ai-sdk/provider";

interface ThinkingConfig {
  includeThoughts?: boolean;
  thinkingBudget?: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high" | "xhigh";
}

export abstract class GeminiModelAdapter extends ModelAdapterBase {
  readonly modality = "chat";
  readonly owned_by = "google";
  readonly pricing = {
    monthly_free_tokens: 0,
  };

  transformOptions(options: SharedV2ProviderOptions): SharedV2ProviderOptions {
    const transformed: SharedV2ProviderOptions = {};

    if (options.reasoning) {
      const thinkingConfig = this.transformReasoning(
        options.reasoning as OpenAICompatibleReasoning,
      );
      if (thinkingConfig) {
        transformed.thinkingConfig = thinkingConfig as unknown as Record<
          string,
          JSONValue
        >;
      }
    }

    return transformed;
  }

  transformPrompt(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt {
    return prompt.map((message) => ({
      ...message,
      providerOptions: this.transformThinkingOptions(message.providerOptions),
      content: Array.isArray(message.content)
        ? message.content.map((part) => ({
            ...part,
            providerOptions: this.transformThinkingOptions(
              part.providerOptions,
            ),
          }))
        : message.content,
    })) as LanguageModelV2Prompt;
  }

  private transformThinkingOptions(
    options?: SharedV2ProviderOptions,
  ): SharedV2ProviderOptions | undefined {
    const opts = options as
      | {
          google?: {
            thought_signature?: string;
            thoughtSignature?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }
      | undefined;

    if (opts?.google?.thought_signature) {
      const { thought_signature, ...restGoogle } = opts.google;
      return {
        ...options,
        google: {
          ...restGoogle,
          thoughtSignature: thought_signature,
        },
      };
    }
    return options;
  }

  protected transformReasoning(
    params: OpenAICompatibleReasoning,
  ): ThinkingConfig | undefined {
    const isReasoningActive =
      (params.enabled === true ||
        (params.enabled === undefined &&
          (params.max_tokens !== undefined || params.effort !== undefined))) &&
      params.effort !== "none";

    if (isReasoningActive) {
      const thinkingConfig: ThinkingConfig = {};

      thinkingConfig.includeThoughts =
        params.enabled !== false && params.exclude !== true;

      const specificConfig = this.getThinkingConfig(params);

      return Object.assign(
        {
          includeThoughts: params.enabled !== false && params.exclude !== true,
        },
        specificConfig,
      );
    }

    return undefined;
  }

  protected getThinkingConfig(
    params: OpenAICompatibleReasoning,
  ): ThinkingConfig {
    const thinkingConfig: ThinkingConfig = {};

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

  transformProviderMetadata(
    metadata: SharedV2ProviderMetadata | undefined,
  ): SharedV2ProviderMetadata | undefined {
    if (metadata?.google?.thoughtSignature) {
      const newMetadataGoogle: SharedV2ProviderMetadata["google"] = {
        ...metadata.google,
        thought_signature: metadata.google.thoughtSignature,
      };
      delete newMetadataGoogle.thoughtSignature;

      return {
        ...metadata,
        google: newMetadataGoogle,
      };
    }
    return metadata;
  }
}

export abstract class Gemini3ModelAdapter extends GeminiModelAdapter {}

export class Gemini3ProPreviewAdapter extends Gemini3ModelAdapter {
  readonly id = "google/gemini-3-pro-preview";
  readonly name = "Gemini 3 Pro Preview";
  readonly created = 1_765_855_208;

  protected getThinkingConfig(
    params: OpenAICompatibleReasoning,
  ): ThinkingConfig {
    if (params.max_tokens !== undefined) {
      throw new BadRequestError(
        "max_tokens is not supported for reasoning in Gemini 3 models. Please use 'effort' instead.",
      );
    }
    const thinkingConfig: ThinkingConfig = {};

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
  ): ThinkingConfig {
    if (params.max_tokens !== undefined) {
      throw new BadRequestError(
        "max_tokens is not supported for reasoning in Gemini 3 models. Please use 'effort' instead.",
      );
    }
    const thinkingConfig: ThinkingConfig = {};

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
