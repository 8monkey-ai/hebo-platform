import { SeverityNumber } from "@opentelemetry/api-logs";

export const otelLogLevels = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
] as const;

export type OtelLogLevel = (typeof otelLogLevels)[number];

export const otelSeverityByLevel: Record<OtelLogLevel, SeverityNumber> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};
