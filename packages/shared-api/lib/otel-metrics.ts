import { Metadata } from "@grpc/grpc-js";
import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter as OTLPMetricExporterGrpc } from "@opentelemetry/exporter-metrics-otlp-grpc";
import { OTLPMetricExporter as OTLPMetricExporterProto } from "@opentelemetry/exporter-metrics-otlp-proto";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";

import { betterStackConfig } from "./better-stack";
import { isProduction } from "../env";

// Register the MeterProvider eagerly so that any library calling
// metrics.getMeter() at import time (e.g. @hebo-ai/gateway) gets a real meter
// instead of a NoopMeter. Unlike traces, the metrics API does not use proxies —
// meters created before the provider is registered stay noop forever.
//
// This module MUST be imported before any code that calls metrics.getMeter().

const greptimeOtlpEndpoint =
  process.env.GREPTIMEDB_OTLP_ENDPOINT ?? "http://localhost:4000/v1/otlp";

const getGrpcExporterConfig = () => {
  if (!betterStackConfig) return;

  const metadata = new Metadata();
  metadata.set("Authorization", `Bearer ${betterStackConfig.sourceToken}`);

  return {
    url: betterStackConfig.endpoint,
    metadata,
    compression: CompressionAlgorithm.GZIP,
  };
};

const metricReader = new PeriodicExportingMetricReader({
  exporter: isProduction
    ? new OTLPMetricExporterGrpc(getGrpcExporterConfig())
    : new OTLPMetricExporterProto({
        url: `${greptimeOtlpEndpoint}/v1/metrics`,
        headers: { "x-greptime-pipeline-name": "greptime_identity" },
        compression: CompressionAlgorithm.GZIP,
      }),
  exportIntervalMillis: isProduction ? 60_000 : 5000,
});

const meterProvider = new MeterProvider({ readers: [metricReader] });
metrics.setGlobalMeterProvider(meterProvider);
