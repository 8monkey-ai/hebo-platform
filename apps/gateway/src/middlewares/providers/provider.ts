import type {
  ProviderConfig,
  ProviderSlug,
} from "@hebo/database/src/types/providers";

import type { Provider } from "ai";

export interface ProviderAdapter {
  initialize(config?: ProviderConfig): Promise<this>;
  getProvider(): Promise<Provider>;
  resolveModelId(): Promise<string>;
  supportsModel(modelType: string): boolean;
  transformConfigs(modelConfig: Record<string, any>): Record<string, any>;
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
  
  abstract supportsModel(modelType: string): boolean;

  abstract transformConfigs(modelConfig: Record<string, any>): Record<string, any>;
}
