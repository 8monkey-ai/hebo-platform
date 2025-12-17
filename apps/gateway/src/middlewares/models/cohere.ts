import { ModelAdapterBase } from "./model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export class CohereEmbedV4Adapter extends ModelAdapterBase {
  getModelType(): string {
    return "cohere/embed-v4.0";
  }

  getModality(): "chat" | "embedding" {
    return "embedding";
  }

  getDisplayName(): string {
    return "Cohere Embed v4.0";
  }

  getOwner(): string {
    return "cohere";
  }

  getCreatedAt(): number {
    return 1_764_888_221;
  }

  getMonthlyFreeTokens(): number {
    return 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transformOptions(_options?: ProviderOptions): ProviderOptions {
    return {
      "openai-compatible": {},
    };
  }
}
