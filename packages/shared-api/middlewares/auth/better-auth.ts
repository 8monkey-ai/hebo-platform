import { type Logger } from "@bogeychan/elysia-logger/types";
import { createAuthClient as createBetterAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";
import { Elysia } from "elysia";

import { BadRequestError } from "../../errors";

const AUTH_URL = process.env.AUTH_URL || "http://localhost:3000";

const createAuthClient = (request: Request) => {
  const headers = new Headers();
  for (const name of ["cookie", "authorization", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

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
    ],
    fetchOptions: {
      headers,
    },
  });
};

export const authServiceBetterAuth = new Elysia({
  name: "authenticate-user-better-auth",
})
  .resolve(async (ctx) => {
    const log = (ctx as unknown as { log: Logger }).log;

    const authorization = ctx.request.headers.get("authorization");
    const cookie = ctx.request.headers.get("cookie");

    if (authorization && cookie) {
      throw new BadRequestError(
        "Provide exactly one credential: Bearer API Key or JWT Header",
      );
    }

    const authClient = createAuthClient(ctx.request);

    const { data: session, error } = await authClient.getSession();

    if (error || !session) {
      log.info({ error }, "Authentication failed or no credentials provided");
      return {
        organizationId: undefined,
        userId: undefined,
        authClient: undefined,
      } as const;
    }
    return {
      organizationId: session.session.activeOrganizationId,
      userId: session.user.id,
      authClient,
    } as const;
  })
  .as("scoped");
