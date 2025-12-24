import { Elysia } from "elysia";

import { authServiceBetterAuth } from "./better-auth";
import { isAuthEnabled } from "../../../../apps/auth/lib/env";
import { AuthError } from "../../errors";

const createAuthService = async () => {
  if (!isAuthEnabled) {
    const { authServiceLocalhost } = await import("./localhost");
    return authServiceLocalhost;
  }
  return authServiceBetterAuth;
};

export const authService = new Elysia({ name: "auth-service" })
  .use(await createAuthService())
  .macro({
    isSignedIn: {
      beforeHandle: function checkIsSignedIn({ userId }) {
        if (!userId) throw new AuthError("Unauthorized");
      },
    },
  })
  .as("scoped");
