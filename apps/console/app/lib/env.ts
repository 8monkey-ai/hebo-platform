const shouldAutoDetect = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

const isReachable = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(400) }).then(
    () => true,
    () => false,
  );

export const useMocks = shouldAutoDetect && !(await isReachable("http://localhost:8521"));

type ConsoleEnv = {
  VITE_API_URL?: string;
  VITE_AUTH_URL?: string;
  VITE_GATEWAY_URL?: string;
  VITE_MAGICLINK_AUTH?: string;
};

declare global {
  var heboEnv: ConsoleEnv | undefined;
}

// Runtime config, injected into index.html by serve.ts, wins over the values Vite
// baked in — that's what lets the published image be pointed at any domain without
// a rebuild. Unset keys are omitted, so the build-time value stays in play.
const env: ConsoleEnv = { ...import.meta.env, ...globalThis.heboEnv };

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
