type AwsContainerCredentialResponse = {
  AccessKeyId: string;
  SecretAccessKey: string;
  Token: string;
};

/**
 * Injects AWS credentials from the container metadata service into the process
 * environment so downstream AWS SDK calls can reuse them.
 */
// FUTURE: Let google auth library handle this once they will start supporting WIF for ECS tasks: https://github.com/googleapis/google-cloud-node-core/issues/523
export async function injectMetadataCredentials() {
  const relativeUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
  if (relativeUri) {
    const response = await fetch(`http://169.254.170.2${relativeUri}`);
    const credentials =
      (await response.json()) as AwsContainerCredentialResponse;
    if (
      credentials.AccessKeyId &&
      credentials.SecretAccessKey &&
      credentials.Token
    ) {
      process.env.AWS_ACCESS_KEY_ID = credentials.AccessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = credentials.SecretAccessKey;
      process.env.AWS_SESSION_TOKEN = credentials.Token;
      return;
    }
  }
}

/**
 * Builds the configuration object required to exchange AWS credentials for a
 * Google service account token via Workload Identity Federation.
 */
export function buildWifOptions(audience: string, serviceAccountEmail: string) {
  return {
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:aws:token-type:aws4_request",
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    credential_source: {
      environment_id: "aws1",
      regional_cred_verification_url:
        "https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15",
    },
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
  };
}
