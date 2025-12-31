// isDevLocal is true only in pure local dev: no Turbo/CI context and no explicit service URLs
export const isDevLocal =
  !process.env.TURBO_HASH &&
  !import.meta.env.VITE_API_URL &&
  !import.meta.env.VITE_AUTH_URL &&
  !import.meta.env.VITE_GATEWAY_URL;
export const isDev = import.meta.env.MODE === "development" && !isDevLocal;
export const isAuthEnabled = Boolean(import.meta.env.VITE_AUTH_URL);
