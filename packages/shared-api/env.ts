export const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";
export const isProduction = process.env.NODE_ENV === "production";
export const logLevel =
  process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug");
