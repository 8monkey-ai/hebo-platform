import { Elysia } from "elysia";

import { authServiceStackAuth, projectId } from "./stack-auth";
import { AuthError } from "../../errors";

const createAuthService = async () => {
  if (!projectId) {
    const { authServiceLocalhost } = await import("./localhost");
    return authServiceLocalhost;
  }
  return authServiceStackAuth;
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
