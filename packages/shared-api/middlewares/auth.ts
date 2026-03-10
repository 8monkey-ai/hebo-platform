import { context, propagation } from "@opentelemetry/api";
import { createAuthClient as createBetterAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { getCookieCache, getCookies } from "better-auth/cookies";
import { type Cookie, Elysia } from "elysia";

import { authSecret, authUrl } from "../env";
import { AuthError, BadRequestError } from "../errors";
import { betterAuthCookieOptions } from "../lib/cookie-options";
import type { Logger } from "./logging";

const cookieConfig = getCookies(betterAuthCookieOptions);
const verifyApiKeyUrl = new URL("/v1/api-key/verify", authUrl).toString();

type VerifyApiKeyResult = {
  valid: boolean;
  key?: { userId: string; referenceId: string };
};

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
    ],
    fetchOptions: {
      headers,
    },
  });
};

function extractBearerToken(authorization: string): string | null {
  if (authorization.length < 8 || authorization.substring(0, 7).toLowerCase() !== "bearer ") return null;
  return authorization.substring(7);
}

async function verifyApiKey(key: string): Promise<VerifyApiKeyResult | null> {
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    propagation.inject(context.active(), headers, {
      set: (carrier, key, value) => {
        carrier[key] = value;
      },
    });
    const response = await fetch(verifyApiKeyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ key }),
    });
    if (!response.ok) return null;
    return (await response.json()) as VerifyApiKeyResult;
  } catch {
    return null;
  }
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

    // Cookie auth path
    if (cookie) {
      const session = await getCookieCache(ctx.request, {
        secret: authSecret,
        isSecure: betterAuthCookieOptions.advanced.useSecureCookies,
      });

      if (!session) {
        logger.info("Cookie authentication failed");
        const { attributes, name } = cookieConfig.sessionToken;
        ctx.cookie[name] = {
          value: "",
          maxAge: 0,
          ...attributes,
        } as Cookie<string>;

        return {
          organizationId: undefined,
          userId: undefined,
          authClient,
        } as const;
      }

      return {
        organizationId: session.session.activeOrganizationId as string | undefined,
        userId: session.user.id,
        authClient,
      } as const;
    }

    // API key auth path
    if (authorization) {
      const token = extractBearerToken(authorization);
      if (!token) {
        logger.info("Invalid authorization header format");
        return {
          organizationId: undefined,
          userId: undefined,
          authClient,
        } as const;
      }

      const result = await verifyApiKey(token);
      if (!result?.valid || !result.key) {
        logger.info("API key verification failed");
        return {
          organizationId: undefined,
          userId: undefined,
          authClient,
        } as const;
      }

      // For org-owned keys, referenceId is the organization ID
      return {
        organizationId: result.key.referenceId,
        userId: result.key.userId,
        authClient,
      } as const;
    }

    // No credentials provided
    return {
      organizationId: undefined,
      userId: undefined,
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
