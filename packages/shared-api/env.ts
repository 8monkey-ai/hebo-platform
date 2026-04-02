import { parseLogSeverity } from "./utils/otel-pino";
import { getSecret } from "./utils/secret";

export const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:4100";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";
export const LOG_LEVEL = process.env.LOG_LEVEL ?? (IS_PRODUCTION ? "info" : "debug");
export const LOG_SEVERITY = parseLogSeverity(LOG_LEVEL);
export const AUTH_SECRET =
  (await getSecret("AuthSecret")) ?? (IS_PRODUCTION ? "" : "dev-placeholder-secret");
