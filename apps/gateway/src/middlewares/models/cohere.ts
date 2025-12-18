import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export class CohereEmbedV4Adapter extends ModelAdapterBase {
  readonly id = "cohere/embed-v4.0";
  readonly modality = "embedding";
  readonly name = "Cohere Embed v4.0";
  readonly owned_by = "cohere";
  readonly created = 1_764_888_221;
  readonly pricing = {
    monthly_free_tokens: 0,
  };

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const { openaiCompatible: openAiOptions, ...rest } = options || {};
    if (!openAiOptions) {
      return rest;
    }
    return {
      ...rest,
      openaiCompatible: {},
    };
  }
}
