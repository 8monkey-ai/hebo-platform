import { describe, expect, it } from "bun:test";

import { parseTraceSearchParams } from "./search-params";

describe("parseTraceSearchParams", () => {
  it.each([
    ["chat", "chat"],
    ["embeddings", "embeddings"],
    ["transcriptions", "transcriptions"],
    ["transcription", undefined],
  ] as const)("parses operation=%s", (raw, expected) => {
    const { operation } = parseTraceSearchParams(new URLSearchParams({ operation: raw }));

    expect(operation).toBe(expected);
  });
});
