import { describe, expect, it } from "bun:test";

import { z } from "zod";

import { redactSensitiveValues } from "./utils";

describe("redactSensitiveValues", () => {
  it("redacts fields with meta({ redact: true })", () => {
    const schema = z.discriminatedUnion("authMode", [
      z.object({
        authMode: z.literal("api-key"),
        apiKey: z.string().meta({ redact: true }),
        region: z.string(),
      }),
    ]);

    expect(
      redactSensitiveValues(schema, {
        authMode: "api-key",
        apiKey: "secret",
        region: "us-east-1",
      }),
    ).toEqual({
      authMode: "api-key",
      apiKey: "***",
      region: "us-east-1",
    });
  });

  it("redacts fields across multiple variants", () => {
    const schema = z.discriminatedUnion("authMode", [
      z.object({
        authMode: z.literal("service-account"),
        clientEmail: z.string(),
        privateKey: z.string().meta({ redact: true }),
      }),
      z.object({
        authMode: z.literal("api-key"),
        apiKey: z.string().meta({ redact: true }),
      }),
    ]);

    expect(
      redactSensitiveValues(schema, {
        authMode: "service-account",
        clientEmail: "service-account@example.com",
        privateKey: "super-secret",
      }),
    ).toEqual({
      authMode: "service-account",
      clientEmail: "service-account@example.com",
      privateKey: "***",
    });
  });
});
