import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";

/**
 * GreptimeDB OTLP data model (JSON2, available since v1.3.0-beta).
 *
 * Traces use the built-in `greptime_trace_v2` pipeline, which stores span, scope and
 * resource attributes in JSON2 columns. Logs use a custom pipeline because the built-in
 * OTLP log mapping only supports the legacy JSON type. Both write to new `_v2` tables,
 * since GreptimeDB rejects writes that don't match an existing table's data model.
 */
export const GREPTIME_TRACE_PIPELINE_NAME = "greptime_trace_v2";
export const GREPTIME_TRACE_TABLE_NAME = "opentelemetry_traces_v2";
export const GREPTIME_LOG_PIPELINE_NAME = "hebo_logs_v2";
export const GREPTIME_LOG_TABLE_NAME = "opentelemetry_logs_v2";

// Mirrors the built-in OTLP log schema, with attributes stored as JSON2.
const GREPTIME_LOG_PIPELINE = `version: 2
processors:
  - select:
      type: exclude
      fields:
        - ObservedTimestamp
transform:
  - field: Timestamp, timestamp
    type: epoch, ns
    index: timestamp
  - field: ScopeName, scope_name
    type: string
    index: tag
  - field: Body, body
    type: string
    index: fulltext
  - fields:
      - TraceId, trace_id
      - SpanId, span_id
      - SeverityText, severity_text
      - ScopeVersion, scope_version
      - ScopeSchemaUrl, scope_schema_url
      - ResourceSchemaUrl, resource_schema_url
    type: string
  - fields:
      - SeverityNumber, severity_number
      - TraceFlags, trace_flags
    type: int32
  - fields:
      - LogAttributes, log_attributes
      - ScopeAttributes, scope_attributes
      - ResourceAttributes, resource_attributes
    type: json2
`;

let pipelineRegistration: Promise<void> | undefined;

/**
 * Idempotently registers the log pipeline. A new pipeline version is only uploaded
 * when the latest stored definition differs, so pipeline changes roll out on deploy.
 */
export const ensureGreptimeLogPipeline = (greptimeHttpUrl: string) => {
  pipelineRegistration ??= (async () => {
    const url = `${greptimeHttpUrl}/v1/pipelines/${GREPTIME_LOG_PIPELINE_NAME}`;
    try {
      const existing = await fetch(url);
      if (existing.ok) {
        const { pipelines } = (await existing.json()) as { pipelines?: { pipeline?: string }[] };
        if (pipelines?.[0]?.pipeline === GREPTIME_LOG_PIPELINE) return;
      }
      const created = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-yaml" },
        body: GREPTIME_LOG_PIPELINE,
      });
      if (!created.ok) throw new Error(`${created.status} ${await created.text()}`);
    } catch (error) {
      pipelineRegistration = undefined;
      console.warn(`Failed to register GreptimeDB log pipeline: ${String(error)}`);
    }
  })();
  return pipelineRegistration;
};

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
