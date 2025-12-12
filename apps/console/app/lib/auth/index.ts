import { isAuthEnabled } from "~console/lib/env";

// FUTURE: use dynamic imports to enable tree shaking
import { authService as betterAuthService } from "./better-auth";
import { authService as dummyAuthService } from "./dummy-auth";

import type { AuthService } from "./types";

const authService: AuthService = isAuthEnabled
  ? betterAuthService
  : dummyAuthService;
if (!isAuthEnabled)
  console.warn("⚠️ No auth configured, using dummy auth service");

export { authService };
