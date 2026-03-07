import { parseLogSeverity } from "./utils/otel-pino-adapter";
import { getSecret } from "./utils/secrets";

export const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";
export const isProduction = process.env.NODE_ENV === "production";
export const logLevel = process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");
export const logSeverity = parseLogSeverity(logLevel);
export const authSecret =
  (await getSecret("AuthSecret")) ?? (isProduction ? undefined : "dev-placeholder-secret");
