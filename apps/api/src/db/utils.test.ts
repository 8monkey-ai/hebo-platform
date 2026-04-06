import { describe, expect, it } from "bun:test";

import { z } from "zod";

import { redactSensitiveValues } from "./utils";

describe("redactSensitiveValues", () => {
  it("redacts fields with meta({ redact: true })", () => {
    const schema = z.union([
      z.object({
        apiKey: z.string().meta({ redact: true }),
        region: z.string(),
      }),
    ]);

    expect(
      redactSensitiveValues(schema, {
        apiKey: "secret",
        region: "us-east-1",
      }),
    ).toEqual({
      apiKey: "***",
      region: "us-east-1",
    });
  });

  it("redacts fields in nested unions", () => {
    const schema = z.union([
      z.union([
        z.object({
          authMode: z.literal("service-account"),
          clientEmail: z.string(),
          privateKey: z.string().meta({ redact: true }),
          location: z.string(),
          project: z.string(),
        }),
      ]),
    ]);

    expect(
      redactSensitiveValues(schema, {
        authMode: "service-account",
        clientEmail: "service-account@example.com",
        privateKey: "super-secret",
        location: "us-central1",
        project: "vertex-project",
      }),
    ).toEqual({
      authMode: "service-account",
      clientEmail: "service-account@example.com",
      privateKey: "***",
      location: "us-central1",
      project: "vertex-project",
    });
  });
});
