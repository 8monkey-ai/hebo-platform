import type { BunSqlClient } from "../db/greptime";

/**
 * Derives a Greptime trace table name from an organization ID.
 * Shared between the write path (gateway exporter) and read path (API).
 */
export function orgIdToTableName(orgId: string): string {
  return `traces_${orgId.replaceAll("-", "_")}`;
}

const DEFAULT_TTL = "1d";

/**
 * Creates a tenant-specific trace table in Greptime with the OTel trace data model.
 * No partitioning — single partition per tenant table (validated by benchmark).
 * Idempotent via CREATE TABLE IF NOT EXISTS.
 */
export async function ensureTenantTraceTable(
  greptimeDb: BunSqlClient,
  orgId: string,
  ttl = DEFAULT_TTL,
) {
  const tableName = orgIdToTableName(orgId);

  // Greptime SQL does not support parameterized DDL for table names or TTL,
  // so we validate inputs to prevent injection.
  if (!/^[a-z0-9_]+$/.test(tableName)) {
    throw new Error(`Invalid trace table name: ${tableName}`);
  }
  if (!/^\d+[smhd]$/.test(ttl)) {
    throw new Error(`Invalid TTL value: ${ttl}`);
  }

  await greptimeDb.unsafe(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      timestamp                                              TIMESTAMP(9) NOT NULL,
      trace_id                                               STRING NOT NULL,
      span_id                                                STRING NOT NULL,
      parent_span_id                                         STRING NULL,
      trace_state                                            STRING NULL,
      span_name                                              STRING NULL,
      span_kind                                              STRING NULL,
      span_status_code                                       STRING NULL,
      span_status_message                                    STRING NULL,
      duration_nano                                          BIGINT NULL,
      service_name                                           STRING NULL,
      resource_attributes                                    JSON NULL,
      "span_attributes.hebo.organization.id"                 STRING NULL,
      "span_attributes.hebo.agent.slug"                      STRING NULL,
      "span_attributes.hebo.branch.slug"                     STRING NULL,
      "span_attributes.gen_ai.operation.name"                STRING NULL,
      "span_attributes.gen_ai.request.model"                 STRING NULL,
      "span_attributes.gen_ai.response.model"                STRING NULL,
      "span_attributes.gen_ai.provider.name"                 STRING NULL,
      "span_attributes.gen_ai.input.messages"                STRING NULL,
      "span_attributes.gen_ai.output.messages"               STRING NULL,
      "span_attributes.gen_ai.response.finish_reasons"       STRING NULL,
      "span_attributes.gen_ai.response.id"                   STRING NULL,
      "span_attributes.gen_ai.usage.input_tokens"            BIGINT NULL,
      "span_attributes.gen_ai.usage.output_tokens"           BIGINT NULL,
      "span_attributes.gen_ai.usage.total_tokens"            BIGINT NULL,
      "span_attributes.gen_ai.usage.cache_read.input_tokens" BIGINT NULL,
      "span_attributes.gen_ai.usage.reasoning.output_tokens" BIGINT NULL,
      "span_attributes.gen_ai.request.reasoning.effort"      STRING NULL,
      "span_attributes.gen_ai.request.reasoning.enabled"     STRING NULL,
      "span_attributes.gen_ai.request.reasoning.max_tokens"  BIGINT NULL,
      span_attributes                                        JSON NULL,
      span_events                                            JSON NULL,
      span_links                                             JSON NULL,
      scope_name                                             STRING NULL,
      scope_version                                          STRING NULL,
      scope_attributes                                       JSON NULL,
      TIME INDEX (timestamp),
      PRIMARY KEY (
        "span_attributes.hebo.organization.id",
        "span_attributes.hebo.agent.slug",
        "span_attributes.hebo.branch.slug",
        trace_id,
        span_id
      )
    ) ENGINE = mito
    WITH (
      ttl = '${ttl}'
    )
  `);
}
