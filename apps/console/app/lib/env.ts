const shouldAutoDetect = import.meta.env.DEV && !import.meta.env.VITE_API_URL;

const isReachable = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(400) }).then(
    () => true,
    () => false,
  );

export const useMocks = shouldAutoDetect && !(await isReachable("http://localhost:3001"));
