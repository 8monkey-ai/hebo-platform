import type { apiKey } from "@better-auth/api-key";
import type { Auth, BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware } from "better-auth/api";
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
        (ctx) => {
          const secret = ctx.request?.headers.get("x-internal-secret");
          if (secret !== ctx.context.secret) {
            throw new APIError("FORBIDDEN");
          }

          return getAuth().api.verifyApiKey({
            body: ctx.body,
            asResponse: false,
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};

export type VerifyApiKeyPlugin = typeof verifyApiKeyPlugin;

/**
 * Enforces that only organization `owner` or `admin` members may create API keys.
 * The check applies to the caller (the signed-in user), not the key itself.
 */
export const apiKeyAuthzPlugin = () => {
  return {
    id: "api-key-authz",
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === "/api-key/create",
          handler: createAuthMiddleware(async (ctx) => {
            const session = (ctx as unknown as {
              context: {
                session?: {
                  user: { id: string };
                  session: { activeOrganizationId?: string };
                };
                adapter: {
                  findOne: <T>(args: {
                    model: string;
                    where: Array<{ field: string; value: string }>;
                  }) => Promise<T | null>;
                };
              };
              body?: { organizationId?: string };
            }).context.session;
            if (!session) throw new APIError("UNAUTHORIZED");

            const body = (ctx as unknown as { body?: { organizationId?: string } }).body;
            const organizationId =
              body?.organizationId ?? session.session.activeOrganizationId;
            if (!organizationId) {
              throw new APIError("FORBIDDEN", { message: "No active organization" });
            }

            const adapter = (ctx as unknown as {
              context: {
                adapter: {
                  findOne: <T>(args: {
                    model: string;
                    where: Array<{ field: string; value: string }>;
                  }) => Promise<T | null>;
                };
              };
            }).context.adapter;

            const member = await adapter.findOne<{ role: string }>({
              model: "member",
              where: [
                { field: "userId", value: session.user.id },
                { field: "organizationId", value: organizationId },
              ],
            });
            if (!member || !["owner", "admin"].includes(member.role)) {
              throw new APIError("FORBIDDEN", {
                message: "Only organization owners or admins can create API keys",
              });
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
