import { describe, expect, it } from "bun:test";

import { BASE_PATH, gw } from "./gateway";

describe("gateway body size limit", () => {
  it("accepts transcription bodies larger than the 10 MB library default", async () => {
    const body = JSON.stringify({ padding: "a".repeat(26 * 1024 * 1024) });
    const res = await gw.handler(
      new Request(`http://localhost${BASE_PATH}/audio/transcriptions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
      { organizationId: "org_test" },
    );

    expect(res.status).toBe(400);
  });
});
