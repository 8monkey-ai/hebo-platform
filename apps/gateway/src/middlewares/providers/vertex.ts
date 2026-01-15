import { createVertex } from "@ai-sdk/google-vertex";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { VertexProviderConfig } from "~api/modules/providers/types";
import { toCamelCase, toSnakeCase } from "~gateway/utils/converters";

import { injectMetadataCredentials, buildWifOptions } from "./adapters/aws";
import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

import type {
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
  LanguageModelV2Content,
  SharedV2ProviderMetadata,
} from "@ai-sdk/provider";
import type { ProviderOptions } from "@ai-sdk/provider-utils";

export class VertexProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: VertexProviderConfig;

  static readonly providerSlug = "vertex";

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "google/gemini-3-pro-preview": "gemini-3-pro-preview",
    "google/gemini-3-flash-preview": "gemini-3-flash-preview",
  };

  constructor(modelType: string) {
    super(modelType);
  }

  transformPrompt(prompt: LanguageModelV2Prompt): LanguageModelV2Prompt {
    return prompt.map((message) => ({
      ...message,
      providerOptions: this.convertProviderOptions(message.providerOptions),
      content: Array.isArray(message.content)
        ? message.content.map((part) => ({
            ...part,
            providerOptions: this.convertProviderOptions(part.providerOptions),
          }))
        : message.content,
    })) as LanguageModelV2Prompt;
  }

  transformResult(result: any): any {
    const transformedProviderMetadata = this.transformProviderMetadata(
      result.providerMetadata,
    );

    const transformedContent = result.content?.map(
      (part: LanguageModelV2Content) => ({
        ...part,
        providerMetadata:
          "providerMetadata" in part
            ? this.transformProviderMetadata(part.providerMetadata)
            : undefined,
      }),
    );
    return {
      ...result,
      content: transformedContent,
      providerMetadata: transformedProviderMetadata,
    };
  }

  transformStream(
    stream: ReadableStream<LanguageModelV2StreamPart>,
  ): ReadableStream<LanguageModelV2StreamPart> {
    return stream.pipeThrough(
      new TransformStream<LanguageModelV2StreamPart, LanguageModelV2StreamPart>(
        {
          transform: (chunk, controller) => {
            if ("providerMetadata" in chunk && chunk.providerMetadata) {
              controller.enqueue({
                ...chunk,
                providerMetadata: this.transformProviderMetadata(
                  chunk.providerMetadata,
                ),
              });
            } else {
              controller.enqueue(chunk);
            }
          },
        },
      ),
    );
  }

  private transformProviderMetadata(
    metadata: SharedV2ProviderMetadata | undefined,
  ): SharedV2ProviderMetadata | undefined {
    if (!metadata) return metadata;
    return {
      extra_content: toSnakeCase(metadata),
    } as unknown as SharedV2ProviderMetadata;
  }

  private convertProviderOptions(
    options?: ProviderOptions,
  ): ProviderOptions | undefined {
    if (!options) return options;

    if (options.extra_content) {
      const { extra_content, ...rest } = options;
      const camelCasedExtra = toCamelCase(extra_content);
      return {
        ...rest,
        ...camelCasedExtra,
      };
    }

    return options;
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

  getProviderOptionsName(): string {
    return "google";
  }
}
