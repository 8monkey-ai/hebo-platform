import { createVertex } from "@ai-sdk/google-vertex";

import type { VertexProviderConfig } from "@hebo/database/src/types/providers";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { injectMetadataCredentials, buildWifOptions } from "./adapters/aws";
import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export class VertexProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: VertexProviderConfig;

  static readonly providerSlug = "vertex";

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "google/gemini-2.5-flash-preview-09-2025":
      "gemini-2.5-flash-preview-09-2025",
    "google/gemini-2.5-flash-lite-preview-09-2025":
      "gemini-2.5-flash-lite-preview-09-2025",
    "google/gemini-3-pro-preview": "gemini-3-pro-preview",
    "google/gemini-3-flash-preview": "gemini-3-flash-preview",
  };

  constructor(modelType: string) {
    super(modelType);
  }

  transformOptions(options?: ProviderOptions): ProviderOptions {
    const { "openai-compatible": openAiOptions, ...rest } = options || {};

    if (!openAiOptions) return rest;

    return {
      ...rest,
      google: openAiOptions,
    };
  }

  async initialize(config?: VertexProviderConfig): Promise<this> {
    if (config) {
      this.config = config;
    } else {
      const [serviceAccountEmail, audience, location, project] =
        await Promise.all([
          getSecret("VertexServiceAccountEmail"),
          getSecret("VertexAwsProviderAudience"),
          getSecret("VertexLocation"),
          getSecret("VertexProject"),
        ]);
      this.config = { serviceAccountEmail, audience, location, project };
    }
    return this;
  }

  async getProvider() {
    const cfg = this.config!;
    const { serviceAccountEmail, audience, location, project } = cfg;
    await injectMetadataCredentials();
    return createVertex({
      googleAuthOptions: {
        credentials: buildWifOptions(audience, serviceAccountEmail),
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      },
      location,
      project,
    });
  }
}
