import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createVertex } from "@ai-sdk/google-vertex";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { ProviderV3 } from "@ai-sdk/provider";
import { fromContainerMetadata, fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { withCanonicalIdsForAnthropic } from "@hebo-ai/gateway/providers/anthropic";
import { withCanonicalIdsForBedrock } from "@hebo-ai/gateway/providers/bedrock";
import { withCanonicalIdsForGroq } from "@hebo-ai/gateway/providers/groq";
import { withCanonicalIdsForOpenAI } from "@hebo-ai/gateway/providers/openai";
import { withCanonicalIdsForVertex } from "@hebo-ai/gateway/providers/vertex";
import { withCanonicalIdsForVoyage } from "@hebo-ai/gateway/providers/voyage";
import { createVoyage } from "voyage-ai-provider";

import { getSecret } from "@hebo/shared-api/utils/secret";

import type {
  ApiKeyProviderConfig,
  AzureProviderConfig,
  BedrockProviderConfig,
  ProviderSlug,
  VertexProviderConfig,
} from "~api/modules/providers/types";

import { buildWifOptions } from "../utils/aws";

export async function loadProviderSecrets() {
  const [
    ANTHROPIC_API_KEY,
    BEDROCK_REGION,
    BEDROCK_ROLE_ARN,
    ENFORCE_BYOK,
    FOUNDRY_API_KEY,
    FOUNDRY_RESOURCE_NAME,
    FREE_MODEL_IDS_RAW,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    VERTEX_AUDIENCE,
    VERTEX_LOCATION,
    VERTEX_PROJECT,
    VERTEX_SERVICE_ACCOUNT_EMAIL,
    VOYAGE_API_KEY,
  ] = await Promise.all([
    getSecret("AnthropicApiKey"),
    getSecret("BedrockRegion"),
    getSecret("BedrockRoleArn"),
    getSecret("EnforceByok").then((v) => v === "true"),
    getSecret("FoundryApiKey"),
    getSecret("FoundryResourceName"),
    getSecret("FreeModelIds"),
    getSecret("GroqApiKey"),
    getSecret("OpenaiApiKey"),
    getSecret("VertexAwsProviderAudience"),
    getSecret("VertexLocation"),
    getSecret("VertexProject"),
    getSecret("VertexServiceAccountEmail"),
    getSecret("VoyageApiKey"),
  ]);

  const FREE_MODEL_IDS = new Set(
    (FREE_MODEL_IDS_RAW ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  );

  return {
    ANTHROPIC_API_KEY,
    BEDROCK_REGION,
    BEDROCK_ROLE_ARN,
    ENFORCE_BYOK,
    FOUNDRY_API_KEY,
    FOUNDRY_RESOURCE_NAME,
    FREE_MODEL_IDS,
    GROQ_API_KEY,
    OPENAI_API_KEY,
    VERTEX_AUDIENCE,
    VERTEX_LOCATION,
    VERTEX_PROJECT,
    VERTEX_SERVICE_ACCOUNT_EMAIL,
    VOYAGE_API_KEY,
  };
}

export function createProvider(slug: ProviderSlug, config: unknown): ProviderV3 | undefined {
  if (config == null || typeof config !== "object") return;

  switch (slug) {
    case "bedrock": {
      const bedrockConfig = config as BedrockProviderConfig;
      const region = bedrockConfig.region;
      if (!region) return;

      switch (bedrockConfig.authMode) {
        case "access-key": {
          const { accessKeyId, secretAccessKey } = bedrockConfig;
          if (!accessKeyId || !secretAccessKey) return;
          // credentialProvider: passing keys alone still merges AWS_SESSION_TOKEN from
          // the process env (IRSA, etc.); see https://github.com/vercel/ai/issues/14136
          return withCanonicalIdsForBedrock(
            createAmazonBedrock({
              region,
              credentialProvider: () => Promise.resolve({ accessKeyId, secretAccessKey }),
            }),
          );
        }
        case "iam-role": {
          const { bedrockRoleArn } = bedrockConfig;
          if (!bedrockRoleArn) return;
          return withCanonicalIdsForBedrock(
            createAmazonBedrock({
              region,
              credentialProvider: fromTemporaryCredentials({
                params: { RoleArn: bedrockRoleArn },
                masterCredentials: fromContainerMetadata(),
                clientConfig: { region },
              }),
            }),
            {
              inferenceProfile: {
                arn: { accountId: bedrockRoleArn.split(":")[4], region },
              },
            },
          );
        }
        default:
          return;
      }
    }
    case "groq": {
      const { apiKey } = config as ApiKeyProviderConfig;
      if (!apiKey) return;
      return withCanonicalIdsForGroq(createGroq({ apiKey }));
    }
    case "vertex": {
      const vertexConfig = config as VertexProviderConfig;
      const { location, project } = vertexConfig;
      if (!location || !project) return;

      switch (vertexConfig.authMode) {
        case "service-account": {
          const { clientEmail, privateKey } = vertexConfig;
          if (!clientEmail || !privateKey) return;
          return withCanonicalIdsForVertex(
            createVertex({
              googleAuthOptions: {
                credentials: { client_email: clientEmail, private_key: privateKey },
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              },
              location,
              project,
            }),
          );
        }
        case "identity-federation": {
          const { serviceAccountEmail, audience } = vertexConfig;
          if (!serviceAccountEmail || !audience) return;
          return withCanonicalIdsForVertex(
            createVertex({
              googleAuthOptions: {
                credentials: buildWifOptions(audience, serviceAccountEmail),
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              },
              location,
              project,
            }),
          );
        }
        default:
          return;
      }
    }
    case "voyage": {
      const { apiKey } = config as ApiKeyProviderConfig;
      if (!apiKey) return;
      return withCanonicalIdsForVoyage(createVoyage({ apiKey }));
    }
    case "anthropic": {
      const { apiKey } = config as ApiKeyProviderConfig;
      if (!apiKey) return;
      return withCanonicalIdsForAnthropic(createAnthropic({ apiKey }));
    }
    case "openai": {
      const { apiKey } = config as ApiKeyProviderConfig;
      if (!apiKey) return;
      return withCanonicalIdsForOpenAI(createOpenAI({ apiKey }));
    }
    case "azure": {
      const { apiKey, resourceName } = config as AzureProviderConfig;
      if (!apiKey || !resourceName) return;
      return createAzure({ apiKey, resourceName });
    }
    default: {
      throw new Error(`Unsupported provider: ${slug}`);
    }
  }
}
