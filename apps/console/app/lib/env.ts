const shouldAutoDetect = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

const isReachable = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(400) }).then(
    () => true,
    () => false,
  );

export const useMocks = shouldAutoDetect && !(await isReachable("http://localhost:8521"));

declare global {
  var heboEnv: Record<string, string | undefined> | undefined;
}

// Runtime config from serve.ts wins; unset keys fall through to the build-time values.
const env = { ...import.meta.env, ...globalThis.heboEnv };

// oxlint-disable prefer-nullish-coalescing -- empty string should use the fallback URL
export const apiUrl = useMocks
  ? "http://localhost:8520/api"
  : env.VITE_API_URL || "http://localhost:8521";

export const authUrl = env.VITE_AUTH_URL || "http://localhost:8523";

export const gatewayUrl = useMocks
  ? "http://localhost:8520/gateway"
  : env.VITE_GATEWAY_URL || "http://localhost:8522";
// oxlint-enable prefer-nullish-coalescing

export const magicLinkAuth = env.VITE_MAGICLINK_AUTH === "true";
