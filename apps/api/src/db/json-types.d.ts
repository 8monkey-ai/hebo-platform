import type {
  ModelConfig as _ModelConfig,
  ProviderConfig as _ProviderConfig,
} from "../modules/providers/types";

declare global {
  namespace PrismaJson {
    type ModelConfig = _ModelConfig;
    type ProviderConfig = _ProviderConfig;
  }
}
