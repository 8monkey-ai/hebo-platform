import { useMocks } from "./lib/env";

// Import and start the MSW service worker
if (useMocks && globalThis.window !== undefined) {
  const { worker } = await import("./mocks/browser");
  void worker.start({ onUnhandledRequest: "bypass" });
}
