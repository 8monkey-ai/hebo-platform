import { describe, expect, it } from "bun:test";

import { withPort } from "./url";

describe("withPort", () => {
  it.each([
    ["http://localhost", "http://localhost:8522/"],
    ["http://localhost:3000", "http://localhost:3000/"],
    ["https://gateway.hebo.ai", "https://gateway.hebo.ai/"],
  ])("withPort(%s, 8522) returns %s", (base, expected) => {
    expect(withPort(base, 8522)).toBe(expected);
  });
});
