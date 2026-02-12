import { trace } from "@opentelemetry/api";

import { logLevel } from "../env";
import { betterStackConfig } from "./better-stack";

// Manually inject trace context because @opentelemetry/instrumentation-pino
// requires --experimental-loader for ESM which Bun doesn't support.
// See: https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1955
const customProps = () => {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const spanContext = span.spanContext();
  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
    trace_flags: spanContext.traceFlags.toString(16).padStart(2, "0"),
  };
};

if (betterStackConfig) {
  process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL = "grpc";
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = betterStackConfig.endpoint;
  process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS = `Authorization=Bearer ${betterStackConfig.sourceToken}`;
  process.env.OTEL_EXPORTER_OTLP_LOGS_COMPRESSION = "gzip";
}

export const getLoggerOptions = (serviceName: string) => {
  if (betterStackConfig) {
    return {
      level: logLevel,
      customProps,
      transport: {
        target: "pino-opentelemetry-transport",
        options: {
          resourceAttributes: { "service.name": serviceName },
        },
      },
    };
  }

  return { level: logLevel, customProps };
};
