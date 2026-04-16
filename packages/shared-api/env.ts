import { parseLogLevel } from "./utils/otel-pino";
import { getSecret } from "./utils/secret";

export const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:8523";
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const { level: LOG_LEVEL, severity: LOG_SEVERITY } = parseLogLevel(
  process.env.LOG_LEVEL ?? (IS_PRODUCTION ? "info" : "debug"),
);
export const AUTH_SECRET =
  (await getSecret("AUTH_SECRET")) ?? (IS_PRODUCTION ? "" : "dev-placeholder-secret");
