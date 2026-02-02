import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import {
  BedrockClient,
  ListInferenceProfilesCommand,
} from "@aws-sdk/client-bedrock";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { BedrockProviderConfig } from "~api/modules/providers/types";
import { toSnakeCase } from "~gateway/utils/helpers";

import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

export class BedrockProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: BedrockProviderConfig;

  static readonly providerSlug = "bedrock";

  private static credentialProviderCache = new Map<
    string,
    ReturnType<typeof fromTemporaryCredentials>
  >();

  constructor(modelType: string) {
    super(modelType);
  }

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "openai/gpt-oss-120b": "openai.gpt-oss-120b-1:0",
    "openai/gpt-oss-20b": "openai.gpt-oss-20b-1:0",
  };

  transformOptions(options: ProviderOptions): ProviderOptions {
    const transformed: ProviderOptions = {};

    const snakeCaseConfig = toSnakeCase(options);
    if (Object.keys(snakeCaseConfig).length > 0) {
      transformed.additionalModelRequestFields = snakeCaseConfig;
    }

    return Object.keys(transformed).length > 0 ? transformed : options;
  }

  private getCredentialProvider() {
    const { region, bedrockRoleArn } = this.config!;
    const cacheKey = `${region}:${bedrockRoleArn}`;
    let provider = BedrockProviderAdapter.credentialProviderCache.get(cacheKey);
    if (!provider) {
      provider = fromTemporaryCredentials({
        params: {
          RoleArn: bedrockRoleArn,
          RoleSessionName: "HeboBedrockSession",
        },
        clientConfig: { region },
      });
      BedrockProviderAdapter.credentialProviderCache.set(cacheKey, provider);
    }
    return provider;
  }

  async initialize(config?: BedrockProviderConfig): Promise<this> {
    if (config) {
      this.config = config;
    } else {
      const [bedrockRoleArn, region] = await Promise.all([
        getSecret("BedrockRoleArn"),
        getSecret("BedrockRegion"),
      ]);
      this.config = { bedrockRoleArn, region };
    }
    return this;
  }

  async getProvider() {
    const { region } = this.config!;
    return createAmazonBedrock({
      region,
      credentialProvider: this.getCredentialProvider(),
    });
  }

  async resolveModelId(): Promise<string> {
    const modelId = await super.resolveModelId();

    const { region } = this.config!;
    const client = new BedrockClient({
      region,
      credentials: this.getCredentialProvider(),
    });
    let nextToken: string | undefined;
    do {
      const res = await client.send(
        new ListInferenceProfilesCommand({ nextToken }),
      );
      for (const prof of res.inferenceProfileSummaries ?? []) {
        const arn = prof.inferenceProfileArn ?? "";
        if (arn.includes(modelId)) {
          return arn;
        }
      }
      nextToken = res.nextToken;
    } while (nextToken);
    return modelId;
  }
}
