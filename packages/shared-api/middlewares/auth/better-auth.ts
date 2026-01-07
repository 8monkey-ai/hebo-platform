import { type Logger } from "@bogeychan/elysia-logger/types";
import { createAuthClient } from "better-auth/client";
import {
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
import { Elysia } from "elysia";

import { BadRequestError } from "../../errors";

const AUTH_URL = process.env.AUTH_URL || "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: new URL("/v1", AUTH_URL).toString(),
  plugins: [
    organizationClient({
      teams: { enabled: true },
    }),
    inferAdditionalFields({
      session: {
        teamIds: { type: "string[]" },
      },
    }),
  ],
});

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

    const headers = new Headers();
    if (authorization) headers.set("authorization", authorization);
    if (cookie) headers.set("cookie", cookie);

    const { data: session, error } = await authClient.getSession({
      fetchOptions: {
        headers,
      },
    });

    if (error || !session) {
      log.info({ error }, "Authentication failed or no credentials provided");
      return {
        organizationId: undefined,
        teamIds: undefined,
        userId: undefined,
      } as const;
    }
    return {
      organizationId: session.session.activeOrganizationId,
      teamIds: session.session.teamIds,
      userId: session.user.id,
    } as const;
  })
  .as("scoped");
