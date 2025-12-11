import { Elysia } from "elysia";

import { authServiceBetterAuth } from "./better-auth";
import { AuthError } from "../../errors";

const isAuthEnabled = Boolean(
  process.env.AUTH_ENABLED ?? process.env.VITE_IS_AUTH_ENABLED,
);

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
      beforeHandle({ userId }) {
        if (!userId) throw new AuthError("Unauthorized");
      },
    },
  })
  .as("scoped");
