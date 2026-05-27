import { describe, expect, it } from "bun:test";

import { Elysia } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

import { gatewayErrors } from "./errors";

function makeApp() {
  return new Elysia()
    .use(gatewayErrors)
    .get("/throw-http-401", () => {
      throw new HttpError("Unauthorized", 401, "UNAUTHORIZED");
    })
    .get("/throw-http-422", () => {
      throw new HttpError("Validation failed", 422, "VALIDATION_FAILED");
    })
    .get("/throw-unknown", () => {
      throw new Error("unexpected");
    })
    .post("/v1/messages", () => "ok");
}

describe("gatewayErrors middleware", () => {
  const app = makeApp();

  it("returns 401 for HttpError(401)", async () => {
    const res = await app.handle(new Request("http://localhost/throw-http-401"));
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
  });

  it("returns 422 for HttpError(422)", async () => {
    const res = await app.handle(new Request("http://localhost/throw-http-422"));
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(422);
    expect(body.error.code).toBe("validation_failed");
  });

  it("returns 500 for unknown errors", async () => {
    const res = await app.handle(new Request("http://localhost/throw-unknown"));
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("internal_server_error");
  });

  it("returns 404 for unmatched /v1/messages path with Anthropic-shaped body", async () => {
    const res = await app.handle(
      new Request("http://localhost/v1/v1/messages", { method: "POST", body: "{}" }),
    );
    const body = (await res.json()) as { type: string; error: { type: string; message: string } };

    expect(res.status).toBe(404);
    expect(body.type).toBe("error");
    expect(body.error.type).toBe("not_found_error");
  });

  it("returns 404 for unmatched non-messages path with OpenAI-shaped body", async () => {
    const res = await app.handle(new Request("http://localhost/v1/does-not-exist"));
    const body = (await res.json()) as { error: { type: string; code: string } };

    expect(res.status).toBe(404);
    expect(body.error.type).toBe("invalid_request_error");
  });
});
