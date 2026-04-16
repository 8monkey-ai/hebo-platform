import type { ModelConfig, ProviderConfig } from "../modules/providers/types";

declare global {
  namespace PrismaJson {
    type ModelConfig = ModelConfig;
    type ProviderConfig = ProviderConfig;
  }
}
