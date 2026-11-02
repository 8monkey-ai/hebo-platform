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
