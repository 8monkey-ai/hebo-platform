export const authBaseUrl = process.env.AUTH_URL || `http://localhost:3000`;
export const isAuthEnabled = Boolean(process.env.AUTH_URL);
export const isRemote = process.env.IS_REMOTE === "true";
export const trustedOrigins = (
  process.env.AUTH_TRUSTED_ORIGINS ??
  // eslint-disable-next-line sonarjs/no-clear-text-protocols -- local dev origins
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
