import type { OpenAICompatibleOptions } from "~gateway/utils/openai-compatible-api-schemas";

export interface ModelAdapter {
  getModelType(): string;
  getModality(): "chat" | "embedding";
  getDisplayName(): string;
  getMonthlyFreeTokens(): number;
  getOwner(): string;
  getCreatedAt(): number;
  transformConfigs(options?: OpenAICompatibleOptions): Record<string, unknown>;
}

export abstract class ModelAdapterBase implements ModelAdapter {
  abstract getModelType(): string;

  abstract getModality(): "chat" | "embedding";

  abstract getDisplayName(): string;

  abstract getMonthlyFreeTokens(): number;

  abstract getOwner(): string;

  abstract getCreatedAt(): number;

  abstract transformConfigs(
    options?: OpenAICompatibleOptions,
  ): Record<string, unknown>;
}
