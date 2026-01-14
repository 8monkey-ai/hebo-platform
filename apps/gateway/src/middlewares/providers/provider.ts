import { BadRequestError } from "@hebo/shared-api/errors";

import type {
  ProviderConfig,
  ProviderSlug,
} from "~api/modules/providers/types";

import type {
  LanguageModelV2Prompt,
  SharedV2ProviderOptions,
} from "@ai-sdk/provider";
import type { Provider } from "ai";

export interface ProviderAdapter {
  readonly providerSlug: ProviderSlug;
  initialize(config?: ProviderConfig): Promise<this>;
  getProvider(): Promise<Provider>;
  getProviderOptionsName(): string;
  resolveModelId(): Promise<string>;
  transformOptions(options: SharedV2ProviderOptions): SharedV2ProviderOptions;
  transformPrompt(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt;
}

export abstract class ProviderAdapterBase implements ProviderAdapter {
  static readonly providerSlug: ProviderSlug;

  protected constructor(protected readonly modelType: string) {}

  get providerSlug(): ProviderSlug {
    return (this.constructor as typeof ProviderAdapterBase).providerSlug;
  }

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {};

  static getModelId(modelType: string): string | undefined {
    return this.SUPPORTED_MODELS_MAP[modelType];
  }

  static supportsModel(modelType: string): boolean {
    return !!this.getModelId(modelType);
  }

  getProviderOptionsName(): string {
    return (this.constructor as typeof ProviderAdapterBase).providerSlug;
  }

  async resolveModelId(): Promise<string> {
    const modelId = (this.constructor as typeof ProviderAdapterBase).getModelId(
      this.modelType,
    );
    if (!modelId) {
      throw new BadRequestError(
        `Model ${this.modelType} not supported by ${this.providerSlug}.`,
      );
    }
    return modelId;
  }

  transformOptions(options: SharedV2ProviderOptions): SharedV2ProviderOptions {
    return options;
  }

  abstract initialize(config?: ProviderConfig): Promise<this>;
  abstract getProvider(): Promise<Provider>;

  transformPrompt(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt {
    return prompt;
  }
}
