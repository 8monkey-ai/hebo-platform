/**
 * GreptimeDB trace data model (JSON2, available since v1.3.0).
 *
 * The built-in `greptime_trace_v2` pipeline stores span, scope and resource attributes in
 * JSON2 columns. It writes to a new `_v2` table, since GreptimeDB rejects V2 writes into a
 * table created by the V1 pipeline. The table is auto-created on the first write.
 *
 * Known issue (v1.3.0): GreptimeDB doesn't escape JSON2 object keys over the Postgres wire
 * protocol, so a span attribute key containing `"` or `\` makes any query returning that
 * span's `span_attributes` fail to parse. Accepted as an edge case (user metadata keys only).
 */
export const GREPTIME_TRACE_PIPELINE_NAME = "greptime_trace_v2";
export const GREPTIME_TRACE_TABLE_NAME = "opentelemetry_traces_v2";
