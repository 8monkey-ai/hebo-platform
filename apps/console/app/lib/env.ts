const shouldAutoDetect = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

const isReachable = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(400) }).then(
    () => true,
    () => false,
  );

export const useMocks = shouldAutoDetect && !(await isReachable("http://localhost:4101"));

// oxlint-disable prefer-nullish-coalescing -- empty string should use the fallback URL
export const apiUrl = useMocks
  ? "http://localhost:4200/api"
  : import.meta.env.VITE_API_URL || "http://localhost:4101";

export const authUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:4100";

export const gatewayUrl = useMocks
  ? "http://localhost:4200/gateway"
  : import.meta.env.VITE_GATEWAY_URL || "http://localhost:4102";
// oxlint-enable prefer-nullish-coalescing

export const magicLinkAuth = import.meta.env.VITE_MAGICLINK_AUTH === "true";
