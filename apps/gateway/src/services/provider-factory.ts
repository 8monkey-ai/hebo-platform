import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
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
    enforceByok,
    freeModelIds,
  };
}

export function createProvider(slug: ProviderSlug, config: unknown): ProviderV3 | undefined {
  switch (slug) {
    case "bedrock": {
      const { bedrockRoleArn, region } = config as BedrockProviderConfig;
      if (!bedrockRoleArn || !region) return;
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
      const { serviceAccountEmail, audience, location, project } = config as VertexProviderConfig;
      if (!serviceAccountEmail || !audience || !location || !project) return;
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
    default: {
      throw new Error(`Unsupported provider: ${slug}`);
    }
  }
}
