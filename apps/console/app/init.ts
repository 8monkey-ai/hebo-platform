import { isDevLocal } from "./lib/env";

// Import and start the MSW service worker
if (isDevLocal && globalThis.window !== undefined) {
  const { worker } = await import("./mocks/browser");
  worker.start({ onUnhandledRequest: "bypass" });
}
