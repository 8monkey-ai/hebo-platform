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
  private config!: BedrockProviderConfig;
  private credentials!: ReturnType<typeof fromTemporaryCredentials>;

  static readonly providerSlug = "bedrock";

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
    this.credentials = fromTemporaryCredentials({
      params: {
        RoleArn: this.config.bedrockRoleArn,
        RoleSessionName: "HeboBedrockSession",
      },
      clientConfig: { region: this.config.region },
    });
    return this;
  }

  async getProvider() {
    return createAmazonBedrock({
      region: this.config.region,
      credentialProvider: this.credentials,
    });
  }

  async resolveModelId(): Promise<string> {
    const modelId = await super.resolveModelId();

    const client = new BedrockClient({
      region: this.config.region,
      credentials: this.credentials,
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
