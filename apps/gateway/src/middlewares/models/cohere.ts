import { ModelAdapterBase } from "./model";

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

  transformConfigs(): Record<string, unknown> {
    return {};
  }
}
