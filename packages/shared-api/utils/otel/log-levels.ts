import { SeverityNumber } from "@opentelemetry/api-logs";

export const otelLogLevels = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
] as const;

export const otelSeverityByLevel: Record<
  (typeof otelLogLevels)[number],
  SeverityNumber
> = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};
