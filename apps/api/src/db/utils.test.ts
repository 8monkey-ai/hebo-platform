import { describe, expect, it } from "bun:test";

import { t } from "elysia";

import { redactSensitiveValues } from "./utils";

describe("redactSensitiveValues", () => {
  it("redacts direct x-redact properties", () => {
    const schema = t.Object({
      apiKey: t.String({ "x-redact": true }),
      region: t.String(),
    });

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

  it("redacts transform-wrapped properties from the inner schema annotation", () => {
    const schema = t.Union([
      t.Object({
        authMode: t.Literal("service-account"),
        clientEmail: t.String(),
        privateKey: t
          .Transform(t.String({ "x-redact": true }))
          .Decode((v) => v.replaceAll("\\n", "\n"))
          .Encode((v) => v),
        location: t.String(),
        project: t.String(),
      }),
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
