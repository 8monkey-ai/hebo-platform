import { Elysia } from "elysia";

import { authServiceBetterAuth } from "./better-auth";
import { AuthError } from "../../errors";

export const authService = new Elysia({ name: "auth-service" })
  .use(authServiceBetterAuth)
  .macro({
    isSignedIn: {
      beforeHandle: function checkIsSignedIn({ organizationId, userId }) {
        if (!organizationId || !userId) throw new AuthError("Unauthorized");
      },
    },
  })
  .as("scoped");
