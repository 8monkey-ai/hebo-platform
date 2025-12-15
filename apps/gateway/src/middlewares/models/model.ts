import type { OpenAICompatibleReasoning } from "~gateway/utils/openai-compatible-api-schemas";

export interface ModelAdapter {
  getModelType(): string;
  getModality(): "chat" | "embedding";
  getDisplayName(): string;
  getMonthlyFreeTokens(): number;
  getOwner(): string;
  getCreatedAt(): number;
  transformConfigs(options: OpenAICompatibleOptions): Record<string, any>;
}

export abstract class ModelAdapterBase implements ModelAdapter {
  abstract getModelType(): string;

  abstract getModality(): "chat" | "embedding";

  abstract getDisplayName(): string;

  abstract getMonthlyFreeTokens(): number;

  abstract getOwner(): string;

  abstract getCreatedAt(): number;

  abstract transformConfigs(
    options: OpenAICompatibleOptions,
  ): Record<string, any>;
}

export type OpenAICompatibleOptions = {
  reasoning?: OpenAICompatibleReasoning;
  [key: string]: any;
};
