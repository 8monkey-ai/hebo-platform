import type {
  ProviderConfig,
  ProviderSlug,
} from "@hebo/database/src/types/providers";

import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { Provider } from "ai";

export interface ProviderAdapter {
  initialize(config?: ProviderConfig): Promise<this>;
  getProvider(): Promise<Provider>;
  resolveModelId(): Promise<string>;
  transformOptions(options?: ProviderOptions): ProviderOptions;
  getProviderSlug(): ProviderSlug;
}

export abstract class ProviderAdapterBase {
  protected constructor(
    protected readonly providerSlug: ProviderSlug,
    protected readonly modelType: string,
  ) {}

  public getProviderSlug(): ProviderSlug {
    return this.providerSlug;
  }

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {};

  static getModelId(modelType: string): string | undefined {
    return this.SUPPORTED_MODELS_MAP[modelType];
  }

  static supportsModel(modelType: string): boolean {
    return !!this.getModelId(modelType);
  }

  async resolveModelId(): Promise<string> {
    const modelId = (this.constructor as typeof ProviderAdapterBase).getModelId(
      this.modelType,
    );
    if (!modelId) {
      throw new Error(
        `Model ${this.modelType} not supported by ${this.providerSlug}.`,
      );
    }
    return modelId;
  }

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const { "openai-compatible": openAiOptions, ...rest } = options || {};
    const mergedOptions = { ...rest, ...(openAiOptions as object) };

    return {
      [this.providerSlug]: mergedOptions,
    };
  }
}
