import { describe, expect, it } from "bun:test";

import { createProvider } from "./provider-factory";

describe("createProvider", () => {
  describe("bedrock", () => {
    it("returns undefined when region is missing", () => {
      expect(createProvider("bedrock", { authMode: "iam-role", bedrockRoleArn: "arn:aws:iam::123:role/test", region: "" })).toBeUndefined();
    });

    it("returns undefined when IAM role ARN is missing", () => {
      expect(createProvider("bedrock", { authMode: "iam-role", bedrockRoleArn: "", region: "us-east-1" })).toBeUndefined();
    });

    it("returns a provider for valid IAM role config", () => {
      const provider = createProvider("bedrock", {
        authMode: "iam-role",
        bedrockRoleArn: "arn:aws:iam::123456789012:role/test-role",
        region: "us-east-1",
      });
      expect(provider).toBeDefined();
    });

    it("returns undefined when static credentials are incomplete", () => {
      expect(createProvider("bedrock", { authMode: "access-key", accessKeyId: "AKIA1234", secretAccessKey: "", region: "us-east-1" })).toBeUndefined();
    });

    it("returns a provider for valid access-key credentials", () => {
      const provider = createProvider("bedrock", {
        authMode: "access-key",
        accessKeyId: "AKIA1234567890ABCDEF",
        secretAccessKey: "secretkey123",
        region: "us-east-1",
      });
      expect(provider).toBeDefined();
    });

    it("falls back to IAM role path when authMode is not present", () => {
      const provider = createProvider("bedrock", {
        bedrockRoleArn: "arn:aws:iam::123456789012:role/test-role",
        region: "us-east-1",
      });
      expect(provider).toBeDefined();
    });
  });

  describe("vertex", () => {
    it("returns undefined when location is missing", () => {
      expect(createProvider("vertex", { authMode: "identity-federation", serviceAccountEmail: "sa@proj.iam.gserviceaccount.com", audience: "aud", location: "", project: "proj" })).toBeUndefined();
    });

    it("returns a provider for valid identity-federation config", () => {
      const provider = createProvider("vertex", {
        authMode: "identity-federation",
        serviceAccountEmail: "sa@proj.iam.gserviceaccount.com",
        audience: "//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/aws",
        location: "us-central1",
        project: "my-project",
      });
      expect(provider).toBeDefined();
    });

    it("returns undefined when service account credentials are missing", () => {
      expect(createProvider("vertex", { authMode: "service-account", clientEmail: "", privateKey: "key", location: "us-central1", project: "proj" })).toBeUndefined();
      expect(createProvider("vertex", { authMode: "service-account", clientEmail: "sa@test.iam.gserviceaccount.com", privateKey: "", location: "us-central1", project: "proj" })).toBeUndefined();
    });

    it("returns a provider for valid service account config", () => {
      const provider = createProvider("vertex", {
        authMode: "service-account",
        clientEmail: "sa@test.iam.gserviceaccount.com",
        privateKey: "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----\n",
        location: "us-central1",
        project: "my-project",
      });
      expect(provider).toBeDefined();
    });
  });

  describe("azure", () => {
    it("returns undefined when apiKey is missing", () => {
      expect(createProvider("azure", { authMode: "azure-api-key", apiKey: "", resourceName: "my-resource" })).toBeUndefined();
    });

    it("returns undefined when resourceName is missing", () => {
      expect(createProvider("azure", { authMode: "azure-api-key", apiKey: "key123", resourceName: "" })).toBeUndefined();
    });

    it("returns a provider for valid Azure config", () => {
      const provider = createProvider("azure", {
        authMode: "azure-api-key",
        apiKey: "key123",
        resourceName: "my-resource",
      });
      expect(provider).toBeDefined();
    });

    it("returns a provider with optional apiVersion", () => {
      const provider = createProvider("azure", {
        authMode: "azure-api-key",
        apiKey: "key123",
        resourceName: "my-resource",
        apiVersion: "2024-02-01",
      });
      expect(provider).toBeDefined();
    });
  });

  describe("api key providers", () => {
    for (const slug of ["anthropic", "openai", "groq", "voyage"] as const) {
      it(`returns undefined for ${slug} when apiKey is missing`, () => {
        expect(createProvider(slug, { authMode: "api-key", apiKey: "" })).toBeUndefined();
      });

      it(`returns a provider for ${slug} with valid apiKey`, () => {
        const provider = createProvider(slug, { authMode: "api-key", apiKey: "test-key-123" });
        expect(provider).toBeDefined();
      });
    }
  });

  it("throws for unsupported provider", () => {
    expect(() => createProvider("unknown" as never, {})).toThrow("Unsupported provider: unknown");
  });
});
