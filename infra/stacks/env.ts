// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

export const isProduction = $app.stage === "production";

const getSstSecret = (name: string) => new sst.Secret(name, "undefined");

// Auth
export const authSecret = getSstSecret("AuthSecret");
export const githubClientId = getSstSecret("GithubClientId");
export const githubClientSecret = getSstSecret("GithubClientSecret");
export const googleClientId = getSstSecret("GoogleClientId");
export const googleClientSecret = getSstSecret("GoogleClientSecret");
export const microsoftClientId = getSstSecret("MicrosoftClientId");
export const microsoftClientSecret = getSstSecret("MicrosoftClientSecret");
export const smtpHost = getSstSecret("SmtpHost");
export const smtpPort = getSstSecret("SmtpPort");
export const smtpUser = getSstSecret("SmtpUser");
export const smtpPass = getSstSecret("SmtpPass");
export const smtpFrom = getSstSecret("SmtpFrom");

// LLMs
export const anthropicApiKey = getSstSecret("AnthropicApiKey");
export const foundryApiKey = getSstSecret("FoundryApiKey");
export const foundryResourceName = getSstSecret("FoundryResourceName");
export const bedrockRegion = getSstSecret("BedrockRegion");
export const bedrockRoleArn = getSstSecret("BedrockRoleArn");
export const groqApiKey = getSstSecret("GroqApiKey");
export const openaiApiKey = getSstSecret("OpenaiApiKey");
export const vertexAwsProviderAudience = getSstSecret("VertexAwsProviderAudience");
export const vertexLocation = getSstSecret("VertexLocation");
export const vertexProject = getSstSecret("VertexProject");
export const vertexServiceAccountEmail = getSstSecret("VertexServiceAccountEmail");
export const voyageApiKey = getSstSecret("VoyageApiKey");

// BYOK
export const enforceByok = getSstSecret("EnforceByok");
export const freeModelIds = getSstSecret("FreeModelIds");

// OTEL Exporter
export const greptimeHost = getSstSecret("GreptimeHost");

export const authSecrets = [
  authSecret,
  githubClientId,
  githubClientSecret,
  googleClientId,
  googleClientSecret,
  microsoftClientId,
  microsoftClientSecret,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  smtpFrom,
];

export const llmSecrets = [
  anthropicApiKey,
  bedrockRegion,
  bedrockRoleArn,
  enforceByok,
  foundryApiKey,
  foundryResourceName,
  freeModelIds,
  groqApiKey,
  openaiApiKey,
  vertexAwsProviderAudience,
  vertexLocation,
  vertexProject,
  vertexServiceAccountEmail,
  voyageApiKey,
];

export const normalizedStage = $app.stage
  .trim()
  .toLowerCase()
  .replaceAll(/[^a-z0-9]+/g, "-")
  .replaceAll(/^-+|-+$/g, "");
