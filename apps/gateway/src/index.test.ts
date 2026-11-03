import { describe, expect, it } from "bun:test";

import { createGateway } from "./index";

describe("gateway routes", () => {
  it.each(["/chat/completions", "/embeddings", "/audio/transcriptions", "/responses", "/messages"])(
    "requires authentication for POST /v1%s",
    async (path) => {
      const res = await createGateway().handle(
        new Request(`http://localhost/v1${path}`, { method: "POST" }),
      );

      expect(res.status).toBe(401);
    },
  );
});

const getSpec = async () => {
  const res = await createGateway().handle(new Request("http://localhost/openapi/json"));
  return (await res.json()) as {
    paths: Record<string, Record<string, { requestBody?: { content: object } }>>;
  };
};

describe("gateway OpenAPI spec", () => {
  it.each(["/chat/completions", "/embeddings", "/audio/transcriptions", "/responses", "/messages"])(
    "documents the request body for POST /v1%s",
    async (path) => {
      const spec = await getSpec();

      expect(Object.keys(spec.paths[`/v1${path}`]?.post?.requestBody?.content ?? {})).toContain(
        "application/json",
      );
    },
  );

  it("documents the model ID as a path parameter", async () => {
    const spec = await getSpec();

    expect(spec.paths["/v1/models/{model}"]?.get).toBeDefined();
    expect(spec.paths["/v1/models/*"]).toBeUndefined();
  });
});
