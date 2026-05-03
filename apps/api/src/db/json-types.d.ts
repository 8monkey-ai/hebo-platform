import type { ProviderConfig as _ProviderConfig } from "../modules/providers/types";

declare global {
  namespace PrismaJson {
    type ProviderConfig = _ProviderConfig;
  }
}
