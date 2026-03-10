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

const createAuthClient = (request: Request) => {
  const headers = new Headers();
  for (const name of ["cookie", "origin"]) {
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

type VerifyApiKeyResponse = {
  valid: boolean;
  key?: {
    userId: string;
    referenceId: string;
  };
  error?: string;
};

const verifyApiKey = async (key: string): Promise<VerifyApiKeyResponse> => {
  const headers = new Headers({ "Content-Type": "application/json" });

  // Inject OTEL trace context for distributed tracing
  propagation.inject(context.active(), headers, {
    set: (carrier, key, value) => carrier.set(key, value),
  });

  const response = await fetch(new URL("/v1/api-key/verify", authUrl), {
    method: "POST",
    headers,
    body: JSON.stringify({ key }),
  });

  return response.json() as Promise<VerifyApiKeyResponse>;
};

export const authService = new Elysia({ name: "auth-service" })
  .resolve(async function resolveAuthContext(ctx) {
    const logger = (ctx as unknown as { logger: Logger }).logger;
    const authorization = ctx.request.headers.get("authorization");
    const cookie = ctx.request.headers.get("cookie");

    if (authorization && cookie) {
      throw new BadRequestError("Provide exactly one credential: Bearer API Key or JWT Header");
    }

    let organizationId: string | undefined;
    let userId: string | undefined;
    let authClient: ReturnType<typeof createAuthClient> | undefined;

    if (cookie) {
      const session = await getCookieCache(ctx.request, {
        secret: authSecret,
        isSecure: betterAuthCookieOptions.advanced.useSecureCookies,
      });

      if (session) {
        organizationId = session.session.activeOrganizationId;
        userId = session.user.id;
        authClient = createAuthClient(ctx.request);
      } else {
        logger.info("Cookie auth failed: no valid session");
      }
    } else if (authorization) {
      const key = authorization.replace("Bearer ", "");
      const result = await verifyApiKey(key);

      if (result.valid && result.key) {
        // For org-owned API keys, referenceId is the organization ID
        organizationId = result.key.referenceId;
        userId = result.key.userId;
      } else {
        logger.info({ error: result.error }, "API key verification failed");
      }
    }

    if (!organizationId || !userId) {
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
