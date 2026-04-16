import { useMocks } from "./lib/env";
import { initZod } from "./lib/zod";

initZod();

// Import and start the MSW service worker
if (useMocks && globalThis.window !== undefined) {
  const { worker } = await import("./mocks/browser");
  void worker.start({ onUnhandledRequest: "bypass" });
}
