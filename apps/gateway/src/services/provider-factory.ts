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

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type {
  ApiKeyProviderConfig,
  AzureProviderConfig,
  BedrockProviderConfig,
  ProviderSlug,
  VertexProviderConfig,
} from "~api/modules/providers/types";

import { buildWifOptions } from "./aws-wif";

export async function loadProviderSecrets() {
  const [
    groqApiKey,
    bedrockRoleArn,
    bedrockRegion,
    voyageApiKey,
    vertexServiceAccountEmail,
    vertexAudience,
    vertexLocation,
    vertexProject,
    anthropicApiKey,
    openAiApiKey,
    azureApiKey,
    azureResourceName,
    enforceByok,
    freeModelIdsRaw,
  ] = await Promise.all([
    getSecret("GroqApiKey"),
    getSecret("BedrockRoleArn"),
    getSecret("BedrockRegion"),
    getSecret("VoyageApiKey"),
    getSecret("VertexServiceAccountEmail"),
    getSecret("VertexAwsProviderAudience"),
    getSecret("VertexLocation"),
    getSecret("VertexProject"),
    getSecret("AnthropicApiKey"),
    getSecret("OpenAiApiKey"),
    getSecret("AzureOpenAiApiKey"),
    getSecret("AzureOpenAiResourceName"),
    getSecret("EnforceByok").then((v) => v === "true"),
    getSecret("FreeModelIds"),
  ]);

  const freeModelIds = new Set(
    (freeModelIdsRaw ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  );

  return {
    groqApiKey,
    bedrockRoleArn,
    bedrockRegion,
    voyageApiKey,
    vertexServiceAccountEmail,
    vertexAudience,
    vertexLocation,
    vertexProject,
    anthropicApiKey,
    openAiApiKey,
    azureApiKey,
    azureResourceName,
    enforceByok,
    freeModelIds,
  };
}

export function createProvider(slug: ProviderSlug, config: unknown): ProviderV3 | undefined {
  switch (slug) {
    case "bedrock": {
      const bedrockConfig = config as BedrockProviderConfig;
      const region = bedrockConfig.region;
      if (!region) return;

      if ("authMode" in bedrockConfig && bedrockConfig.authMode === "access-key") {
        const { accessKeyId, secretAccessKey } = bedrockConfig;
        if (!accessKeyId || !secretAccessKey) return;
        return withCanonicalIdsForBedrock(
          createAmazonBedrock({ region, accessKeyId, secretAccessKey }),
        );
      }

      // Default: IAM role path (cloud deployments)
      const bedrockRoleArn =
        "bedrockRoleArn" in bedrockConfig ? bedrockConfig.bedrockRoleArn : undefined;
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
    case "groq": {
      const { apiKey } = config as ApiKeyProviderConfig;
      if (!apiKey) return;
      return withCanonicalIdsForGroq(createGroq({ apiKey }));
    }
    case "vertex": {
      const vertexConfig = config as VertexProviderConfig;
      const { location, project } = vertexConfig;
      if (!location || !project) return;

      if ("authMode" in vertexConfig && vertexConfig.authMode === "service-account") {
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

      // Default: Identity federation path (cloud deployments)
      const serviceAccountEmail =
        "serviceAccountEmail" in vertexConfig ? vertexConfig.serviceAccountEmail : undefined;
      const audience = "audience" in vertexConfig ? vertexConfig.audience : undefined;
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
      const { apiKey, resourceName, apiVersion } = config as AzureProviderConfig;
      if (!apiKey || !resourceName) return;
      return withCanonicalIdsForOpenAI(
        createAzure({ apiKey, resourceName, apiVersion: apiVersion?.trim() || undefined }),
      );
    }
    default: {
      throw new Error(`Unsupported provider: ${slug}`);
    }
  }
}
