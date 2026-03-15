import type { apiKey } from "@better-auth/api-key";
import type { Auth, BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { z } from "zod";

export type AuthWithApiKeyPlugin = Auth<{
  plugins: [ReturnType<typeof apiKey>];
}>;

export const verifyApiKeyPlugin = (getAuth: () => AuthWithApiKeyPlugin) => {
  return {
    id: "verify-api-key-internal",
    endpoints: {
      verifyApiKeyInternal: createAuthEndpoint(
        "/internal/verify-api-key",
        {
          method: "POST",
          body: z.object({ key: z.string() }),
        },
        async (ctx) => {
          const secret = ctx.request?.headers.get("x-internal-secret");
          if (secret !== ctx.context.secret) {
            throw new APIError("FORBIDDEN");
          }

          return await getAuth().api.verifyApiKey({
            body: ctx.body,
            asResponse: false,
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};

export type VerifyApiKeyPlugin = typeof verifyApiKeyPlugin;
