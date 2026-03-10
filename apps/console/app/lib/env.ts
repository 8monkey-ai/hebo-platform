const shouldAutoDetect = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

const isReachable = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(400) }).then(
    () => true,
    () => false,
  );

export const useMocks = shouldAutoDetect && !(await isReachable("http://localhost:3001"));

export const apiUrl = useMocks
  ? "http://localhost:5173/api"
  : import.meta.env.VITE_API_URL || "http://localhost:3001";

export const authUrl = import.meta.env.VITE_AUTH_URL || "http://localhost:3000";

export const gatewayUrl = useMocks
  ? "http://localhost:5173/gateway"
  : import.meta.env.VITE_GATEWAY_URL || "http://localhost:3002";
