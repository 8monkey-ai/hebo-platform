import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";

/**
 * GreptimeDB trace data model (JSON2, available since v1.3.0).
 *
 * The built-in `greptime_trace_v2` pipeline stores span, scope and resource attributes in
 * JSON2 columns. It writes to a new `_v2` table, since GreptimeDB rejects V2 writes into a
 * table created by the V1 pipeline. The table is auto-created on the first write.
 */
export const GREPTIME_TRACE_PIPELINE_NAME = "greptime_trace_v2";
export const GREPTIME_TRACE_TABLE_NAME = "opentelemetry_traces_v2";

// oxlint-disable-next-line no-control-regex
const UNSAFE_KEY_CHAR = /["\\\u0000-\u001F]/u;
// oxlint-disable-next-line no-control-regex
const UNSAFE_KEY_CHARS = /["\\\u0000-\u001F]/gu;

/**
 * FUTURE: remove once GreptimeDB escapes JSON2 object keys over the Postgres wire protocol.
 * Until then a single key containing `"`, `\` or a control character (e.g. user-provided
 * `gen_ai.request.metadata.*` keys) produces invalid JSON and breaks every query that
 * selects the `span_attributes` column.
 */
export class AttributeKeySanitizer implements SpanProcessor {
  onStart() {}

  onEnd(span: ReadableSpan) {
    const { attributes } = span;
    for (const key in attributes) {
      if (!UNSAFE_KEY_CHAR.test(key)) continue;
      attributes[key.replaceAll(UNSAFE_KEY_CHARS, "_")] = attributes[key];
      delete attributes[key];
    }
  }

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}
