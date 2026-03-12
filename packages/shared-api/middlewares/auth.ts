import { context, propagation } from "@opentelemetry/api";
import {
  BetterAuthClientPlugin,
  createAuthClient as createBetterAuthClient,
} from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { getCookieCache, getCookies } from "better-auth/cookies";
import { type Cookie, Elysia } from "elysia";

import type { VerifyApiKeyPlugin } from "@hebo/auth/better-auth";

import { authSecret, authUrl } from "../env";
import { AuthError, BadRequestError } from "../errors";
import { betterAuthCookieOptions } from "../lib/cookie-options";
import type { Logger } from "./logging";

const cookieConfig = getCookies(betterAuthCookieOptions);

const createAuthClient = (request: Request) => {
  const headers = new Headers();
  for (const name of ["cookie", "authorization", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Inject OTEL trace context (traceparent, tracestate) for distributed tracing
  propagation.inject(context.active(), headers, {
    set: (carrier, key, value) => carrier.set(key, value),
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
      } satisfies BetterAuthClientPlugin,
    ],
    fetchOptions: {
      headers,
    },
  });
};

function extractBearerToken(header: string): string | null {
  if (header.length < 7) return null;
  if (header.slice(0, 7).toLowerCase() !== "bearer ") return null;
  return header.slice(7);
}

export const authService = new Elysia({ name: "auth-service" })
  .resolve(async function resolveAuthContext(ctx) {
    const logger = (ctx as unknown as { logger: Logger }).logger;
    const authorization = ctx.request.headers.get("authorization");
    const cookie = ctx.request.headers.get("cookie");

    if (authorization && cookie) {
      throw new BadRequestError("Provide exactly one credential: Bearer API Key or JWT Header");
    }

    const authClient = createAuthClient(ctx.request);

    let organizationId: string | undefined;
    let userId: string | undefined;

    if (cookie) {
      const session = await getCookieCache(ctx.request, {
        secret: authSecret,
        isSecure: betterAuthCookieOptions.advanced.useSecureCookies,
      });

      if (session) {
        organizationId = session.session.activeOrganizationId;
        userId = session.user.id;
      }
    } else if (authorization) {
      const { data: result } = await authClient.internal.verifyApiKey({
        key: extractBearerToken(authorization) || "no-key",
        fetchOptions: {
          headers: new Headers({ "x-internal-secret": authSecret }),
        },
      });

      if (result?.valid && result.key) {
        // For org-owned keys, referenceId is the organization ID
        organizationId = result.key.referenceId;

        // userId was removed from the apikeys table; resolve from key metadata
        if (result.key.metadata?.createdByUserId) {
          userId = result.key.metadata?.createdByUserId;
        } else {
          logger.warn("API key missing createdByUserId in metadata");
        }
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

      return {
        organizationId: undefined,
        userId: undefined,
        authClient: undefined,
      } as const;
    }

    return {
      organizationId,
      userId,
      authClient,
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
