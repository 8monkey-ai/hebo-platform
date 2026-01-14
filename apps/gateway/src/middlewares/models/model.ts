import { t, type Static } from "elysia";

import type {
  LanguageModelV2Prompt,
  SharedV2ProviderMetadata,
  SharedV2ProviderOptions,
} from "@ai-sdk/provider";

export const supportedModel = t.Object({
  id: t.String(),
  name: t.String(),
  created: t.Number(),
  owned_by: t.String(),
  modality: t.Union([t.Literal("chat"), t.Literal("embedding")]),
  pricing: t.Object({
    monthly_free_tokens: t.Number(),
  }),
});

export type SupportedModel = Static<typeof supportedModel>;

export interface ModelAdapter extends SupportedModel {
  transformOptions(options: SharedV2ProviderOptions): SharedV2ProviderOptions;
  transformPrompt(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt;
  transformProviderMetadata(
    metadata: SharedV2ProviderMetadata | undefined,
  ): SharedV2ProviderMetadata | undefined;
}

export abstract class ModelAdapterBase implements ModelAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly created: number;
  abstract readonly owned_by: string;
  abstract readonly modality: "chat" | "embedding";
  abstract readonly pricing: {
    monthly_free_tokens: number;
  };

  transformOptions(options: SharedV2ProviderOptions): SharedV2ProviderOptions {
    return options;
  }

  transformPrompt(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt {
    return prompt;
  }

  transformProviderMetadata(
    metadata: SharedV2ProviderMetadata | undefined,
  ): SharedV2ProviderMetadata | undefined {
    return metadata;
  }
}
