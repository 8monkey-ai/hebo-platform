import type { OTLPExporterNodeConfigBase } from "@opentelemetry/otlp-exporter-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

import { orgIdToTableName } from "./trace-table";

const ORG_ID_ATTR = "hebo.organization.id";
const GEN_AI_OP_ATTR = "gen_ai.operation.name";
const TABLE_NAME_HEADER = "x-greptime-trace-table-name";

// ExportResultCode values from @opentelemetry/core — inlined to avoid a transitive dep
const SUCCESS = 0;
const FAILED = 1;

type ExportResult = { code: number; error?: Error };

/**
 * Routes gen-AI spans to per-tenant Greptime trace tables via
 * the X-Greptime-Trace-Table-Name header. Non-gen-AI spans (infra spans)
 * fall through to the default shared `opentelemetry_traces` table.
 *
 * Internally maintains one OTLPTraceExporter per tenant table (cached)
 * and a single shared exporter for non-tenant spans.
 */
export class TenantRoutingSpanExporter implements SpanExporter {
  private readonly sharedExporter: OTLPTraceExporter;
  private readonly tenantExporters = new Map<string, OTLPTraceExporter>();
  private readonly baseConfig: OTLPExporterNodeConfigBase;

  constructor(config: OTLPExporterNodeConfigBase) {
    this.baseConfig = config;
    this.sharedExporter = new OTLPTraceExporter(config);
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const sharedSpans: ReadableSpan[] = [];
    const tenantGroups = new Map<string, ReadableSpan[]>();

    for (const span of spans) {
      const orgId = span.attributes[ORG_ID_ATTR] as string | undefined;
      const genAiOp = span.attributes[GEN_AI_OP_ATTR];

      if (genAiOp && orgId) {
        const tableName = orgIdToTableName(orgId);
        let group = tenantGroups.get(tableName);
        if (!group) {
          group = [];
          tenantGroups.set(tableName, group);
        }
        group.push(span);
      } else {
        sharedSpans.push(span);
      }
    }

    let pending = (sharedSpans.length > 0 ? 1 : 0) + tenantGroups.size;

    if (pending === 0) {
      resultCallback({ code: SUCCESS });
      return;
    }

    let hasError = false;
    const onDone = (result: ExportResult) => {
      if (result.code === FAILED) hasError = true;
      pending--;
      if (pending === 0) {
        resultCallback({ code: hasError ? FAILED : SUCCESS });
      }
    };

    if (sharedSpans.length > 0) {
      this.sharedExporter.export(sharedSpans, onDone);
    }

    for (const [tableName, group] of tenantGroups) {
      const exporter = this.getOrCreateTenantExporter(tableName);
      exporter.export(group, onDone);
    }
  }

  async shutdown(): Promise<void> {
    const promises = [this.sharedExporter.shutdown()];
    for (const exporter of this.tenantExporters.values()) {
      promises.push(exporter.shutdown());
    }
    await Promise.all(promises);
    this.tenantExporters.clear();
  }

  async forceFlush(): Promise<void> {
    const promises = [this.sharedExporter.forceFlush()];
    for (const exporter of this.tenantExporters.values()) {
      promises.push(exporter.forceFlush());
    }
    await Promise.all(promises);
  }

  private getOrCreateTenantExporter(tableName: string): OTLPTraceExporter {
    let exporter = this.tenantExporters.get(tableName);
    if (exporter) return exporter;

    const baseHeaders =
      typeof this.baseConfig.headers === "object" ? this.baseConfig.headers : undefined;

    exporter = new OTLPTraceExporter({
      ...this.baseConfig,
      headers: {
        ...baseHeaders,
        [TABLE_NAME_HEADER]: tableName,
      },
    });
    this.tenantExporters.set(tableName, exporter);
    return exporter;
  }
}
