import type { ProviderOptions } from "@ai-sdk/provider-utils";

export interface ModelAdapter {
  getModelType(): string;
  getModality(): "chat" | "embedding";
  getDisplayName(): string;
  getMonthlyFreeTokens(): number;
  getOwner(): string;
  getCreatedAt(): number;
  transformOptions(options?: ProviderOptions): ProviderOptions;
}

export abstract class ModelAdapterBase implements ModelAdapter {
  abstract getModelType(): string;

  abstract getModality(): "chat" | "embedding";

  abstract getDisplayName(): string;

  abstract getMonthlyFreeTokens(): number;

  abstract getOwner(): string;

  abstract getCreatedAt(): number;

  abstract transformOptions(options?: ProviderOptions): ProviderOptions;
}
