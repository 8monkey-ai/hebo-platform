import { describe, expect, test } from "bun:test";

import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";

import { AttributeKeySanitizer } from "./greptime-otlp";

describe("AttributeKeySanitizer", () => {
  test("replaces characters GreptimeDB doesn't escape in JSON2 keys", () => {
    const attributes: Record<string, string> = {
      "gen_ai.request.metadata.session_id": "a",
      'gen_ai.request.metadata.we"ird': "b",
      "gen_ai.request.metadata.back\\slash": "c",
      "gen_ai.request.metadata.new\nline": "d",
    };

    new AttributeKeySanitizer().onEnd({ attributes } as unknown as ReadableSpan);

    expect(attributes).toEqual({
      "gen_ai.request.metadata.session_id": "a",
      "gen_ai.request.metadata.we_ird": "b",
      "gen_ai.request.metadata.back_slash": "c",
      "gen_ai.request.metadata.new_line": "d",
    });
  });
});
