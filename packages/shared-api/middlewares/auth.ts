import { context, propagation } from "@opentelemetry/api";
import { createAuthClient as createBetterAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { getCookieCache, getCookies } from "better-auth/cookies";
import { type Cookie, Elysia } from "elysia";

import type { VerifyApiKeyPlugin } from "~auth/lib/verify-api-key-plugin";

import { authSecret, authUrl } from "../env";
import { AuthError, BadRequestError } from "../errors";
import { betterAuthCookieOptions } from "../lib/cookie-options";
import type { Logger } from "./logging";

const cookieConfig = getCookies(betterAuthCookieOptions);

const createAuthClient = (request: Request) => {
  const headers: Record<string, string> = {};
  for (const name of ["cookie", "authorization", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }

  // Inject OTEL trace context (traceparent, tracestate) for distributed tracing
  propagation.inject(context.active(), headers, {
    set: (carrier, key, value) => (carrier[key] = value),
  });

  return createBetterAuthClient({
    baseURL: new URL("/v1", authUrl).toString(),
    plugins: [
      organizationClient({
        teams: { enabled: true },
        schema: {
          team: {
            additionalFields: {
              agentSlug: {
                type: "string",
              },
            },
          },
        },
      }),
      {
        id: "verify-api-key-plugin" as const,
        $InferServerPlugin: {} as ReturnType<VerifyApiKeyPlugin>,
      },
    ],
    fetchOptions: {
      headers,
    },
  });
};

export const authService = new Elysia({ name: "auth-service" })
  .resolve(async function resolveAuthContext(ctx) {
    const logger = (ctx as unknown as { logger: Logger }).logger;

    const cookie = ctx.request.headers.get("cookie");
    const authorization = ctx.request.headers.get("authorization");

    if (cookie && authorization) {
      throw new BadRequestError("Provide exactly one credential: Bearer API Key or JWT Header");
    }

    const authClient = createAuthClient(ctx.request);

    let userId: string | undefined;
    let organizationId: string | undefined;

    if (cookie) {
      const session = await getCookieCache(ctx.request, {
        secret: authSecret,
        isSecure: betterAuthCookieOptions.advanced.useSecureCookies,
      });

      if (session) {
        userId = session.user.id;
        organizationId = session.session.activeOrganizationId;
      }
    } else if (authorization) {
      const { data: result } = await authClient.internal.verifyApiKey({
        key: authorization.slice(7) || "invalid-key",
        fetchOptions: {
          headers: { "x-internal-secret": authSecret },
        },
      });

      if (result?.valid && result.key) {
        if (result.key.metadata?.createdByUserId) {
          userId = result.key.metadata?.createdByUserId;
        } else {
          logger.warn("API key missing createdByUserId in metadata");
        }

        // For org-owned keys, referenceId is the organization ID
        organizationId = result.key.referenceId;
      }
    }

    if (!organizationId || !userId) {
      logger.info("Authentication failed or no credentials provided");

      // Clear the session cookie when unauthorized
      const { attributes, name } = cookieConfig.sessionToken;
      ctx.cookie[name] = {
        value: "",
        maxAge: 0,
        ...attributes,
      } as Cookie<string>;
    }

    return {
      userId,
      organizationId,
      authClient: userId ? authClient : undefined,
    } as const;
  })
  .macro({
    isSignedIn: {
      beforeHandle: function checkIsSignedIn({ organizationId, userId }) {
        if (!organizationId || !userId) throw new AuthError("Unauthorized");
      },
    },
  })
  .as("scoped");
