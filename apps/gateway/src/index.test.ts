import { describe, expect, it } from "bun:test";

import { createGateway } from "./index";

describe("gateway routes", () => {
  it("requires authentication for POST /v1/audio/transcriptions", async () => {
    const res = await createGateway().handle(
      new Request("http://localhost/v1/audio/transcriptions", { method: "POST" }),
    );
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("auth_error");
  });
});
