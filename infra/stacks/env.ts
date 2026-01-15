const getSstSecret = (name: string, placeholder: string = "undefined") =>
  new sst.Secret(name, placeholder);

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
export const bedrockRoleArn = getSstSecret("BedrockRoleArn");
export const bedrockRegion = getSstSecret("BedrockRegion");
export const voyageApiKey = getSstSecret("VoyageApiKey");
export const groqApiKey = getSstSecret("GroqApiKey");
export const vertexServiceAccountEmail = getSstSecret(
  "VertexServiceAccountEmail",
);
export const vertexAwsProviderAudience = getSstSecret(
  "VertexAwsProviderAudience",
);
export const vertexProject = getSstSecret("VertexProject");
export const vertexLocation = getSstSecret("VertexLocation");

// OTEL Exporter
export const grafanaEndpoint = getSstSecret(
  "GrafanaEndpoint",
  "http://localhost:3000",
);
export const grafanaInstanceId = getSstSecret("GrafanaInstanceId");
export const grafanaApiToken = getSstSecret("GrafanaApiToken");

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
  bedrockRoleArn,
  bedrockRegion,
  voyageApiKey,
  groqApiKey,
  vertexServiceAccountEmail,
  vertexAwsProviderAudience,
  vertexProject,
  vertexLocation,
];

export const otelSecrets = [
  grafanaEndpoint,
  grafanaInstanceId,
  grafanaApiToken,
];

export const isProd = $app.stage === "production";
