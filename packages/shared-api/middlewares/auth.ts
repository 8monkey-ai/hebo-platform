import { context, propagation } from "@opentelemetry/api";
import { createAuthClient as createBetterAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { getCookieCache, getCookies } from "better-auth/cookies";
import { type Cookie, Elysia } from "elysia";

import type { VerifyApiKeyPlugin } from "~auth/lib/api-key";

import { AUTH_SECRET, AUTH_URL } from "../env";
import { AuthError, BadRequestError } from "../errors";
import { COOKIE_CONFIG } from "../lib/better-auth";
import { logging } from "./logging";

const SESSION_TOKEN = getCookies(COOKIE_CONFIG).sessionToken;

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
    baseURL: new URL("/v1", AUTH_URL).toString(),
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

export const auth = new Elysia({ name: "auth-service" })
  .use(logging())
  .resolve(async function resolveAuthContext({ request, cookie, logger }) {
    const cookieHeader = request.headers.get("cookie");
    const authHeader = request.headers.get("authorization");

    if (cookieHeader && authHeader) {
      throw new BadRequestError("Provide exactly one credential: Bearer API Key or JWT Header");
    }

    const authClient = createAuthClient(request);

    let userId: string | undefined;
    let organizationId: string | undefined;

    if (cookieHeader) {
      const session = await getCookieCache(request, {
        secret: AUTH_SECRET,
        isSecure: COOKIE_CONFIG.advanced.useSecureCookies,
      });

      if (session) {
        userId = session.user.id;
        organizationId = session.session.activeOrganizationId as string;
      }
    } else if (authHeader) {
      const { data: result } = await authClient.internal.verifyApiKey({
        key: authHeader.slice(7) || "invalid-key",
        fetchOptions: {
          headers: { "x-internal-secret": AUTH_SECRET },
        },
      });

      if (result?.valid && result.key) {
        if (result.key.metadata?.createdByUserId) {
          userId = result.key.metadata.createdByUserId as string;
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
      const { name, attributes } = SESSION_TOKEN;
      cookie[name] = {
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
