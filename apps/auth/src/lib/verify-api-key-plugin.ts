import { createAuthEndpoint, APIError } from "better-auth/api";
import { z } from "zod";

type VerifyApiKeyResult = {
  valid: boolean;
  error?: { message: string; code: string } | null;
  key: {
    id: string;
    referenceId: string;
    metadata: string | null;
  } | null;
};

// biome-ignore lint: auth.api.verifyApiKey has complex overloaded types
type VerifyApiKeyFn = (...args: any[]) => Promise<any>;

let verifyApiKeyFn: VerifyApiKeyFn | null = null;

export function bindVerifyApiKey(fn: VerifyApiKeyFn) {
  verifyApiKeyFn = fn;
}

export const verifyApiKeyPlugin = {
  id: "verify-api-key-internal" as const,
  endpoints: {
    verifyApiKeyInternal: createAuthEndpoint(
      "/verify-api-key-internal/verify",
      {
        method: "POST",
        body: z.object({ key: z.string() }),
      },
      async (ctx): Promise<VerifyApiKeyResult> => {
        const secret = ctx.request?.headers.get("x-internal-secret");
        if (secret !== ctx.context.secret) {
          throw new APIError("FORBIDDEN");
        }
        if (!verifyApiKeyFn) {
          throw new APIError("INTERNAL_SERVER_ERROR");
        }
        return verifyApiKeyFn({ body: ctx.body });
      },
    ),
  },
};
