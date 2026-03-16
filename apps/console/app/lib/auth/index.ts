import { useMocks } from "~console/lib/env";

import type { AuthService } from "./types";

let authService: AuthService;
let authClient: Awaited<typeof import("./better-auth")>["authClient"] | undefined;
if (useMocks) {
  console.warn("⚠️ No auth configured, using dummy auth service");
  ({ authService } = await import("./dummy-auth"));
} else {
  const mod = await import("./better-auth");
  authService = mod.authService;
  authClient = mod.authClient;
}

export { authService, authClient };
