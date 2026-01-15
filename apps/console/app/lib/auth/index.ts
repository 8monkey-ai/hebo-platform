import { isDevLocal } from "~console/lib/env";

import type { AuthService } from "./types";

let authService: AuthService;
if (isDevLocal) {
  console.warn("⚠️ No auth configured, using dummy auth service");
  ({ authService } = await import("./dummy-auth"));
} else {
  ({ authService } = await import("./better-auth"));
}

export { authService };
