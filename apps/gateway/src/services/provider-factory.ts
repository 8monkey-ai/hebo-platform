import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createVertex } from "@ai-sdk/google-vertex";
import { createGroq } from "@ai-sdk/groq";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { withCanonicalIdsForBedrock } from "@hebo-ai/gateway/providers/bedrock";
import { withCanonicalIdsForGroq } from "@hebo-ai/gateway/providers/groq";
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

import type { ProviderV3 } from "@ai-sdk/provider";

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
  ] = await Promise.all([
    getSecret("GroqApiKey"),
    getSecret("BedrockRoleArn"),
    getSecret("BedrockRegion"),
    getSecret("VoyageApiKey"),
    getSecret("VertexServiceAccountEmail"),
    getSecret("VertexAwsProviderAudience"),
    getSecret("VertexLocation"),
    getSecret("VertexProject"),
  ]);

  return {
    groqApiKey,
    bedrockRoleArn,
    bedrockRegion,
    voyageApiKey,
    vertexServiceAccountEmail,
    vertexAudience,
    vertexLocation,
    vertexProject,
  };
}

export function createProvider(
  slug: ProviderSlug,
  config: unknown,
): ProviderV3 | undefined {
  if (!config) return;

  switch (slug) {
    case "bedrock": {
      const { bedrockRoleArn, region } = config as BedrockProviderConfig;
      return withCanonicalIdsForBedrock(
        createAmazonBedrock({
          region,
          credentialProvider: fromTemporaryCredentials({
            params: { RoleArn: bedrockRoleArn },
            clientConfig: region ? { region } : undefined,
          }),
        }),
      );
    }
    case "groq": {
      const { apiKey } = config as ApiKeyProviderConfig;
      return withCanonicalIdsForGroq(createGroq({ apiKey }));
    }
    case "vertex": {
      const { serviceAccountEmail, audience, location, project } =
        config as VertexProviderConfig;
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
      return withCanonicalIdsForVoyage(createVoyage({ apiKey }));
    }
    default: {
      throw new Error(`Unsupported provider: ${slug}`);
    }
  }
}
