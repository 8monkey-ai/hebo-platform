import { bearer } from "@elysiajs/bearer";
import { Elysia } from "elysia";

import { BadRequestError } from "../../errors";
import { auth } from "../../lib/auth";

const hasCookies = (headers: Headers) => {
  const cookies = headers.get("cookie");
  return Boolean(cookies && cookies.trim());
};

type Logger = { info?: (...args: unknown[]) => void };

export const authServiceBetterAuth = new Elysia({
  name: "authenticate-user-better-auth",
})
  .use(bearer())
  .resolve(async (ctx) => {
    const apiKey = ctx.bearer;
    const headers = ctx.request.headers;
    const cookiePresent = hasCookies(headers);
    const log = (ctx as { log?: Logger }).log;

    if (apiKey && cookiePresent) {
      throw new BadRequestError(
        "Provide exactly one credential: Better Auth session cookie or Bearer API key",
      );
    }

    if (apiKey) {
      const verification = await auth.api.verifyApiKey({
        body: { key: apiKey },
      });

      if (verification?.valid && verification.key?.userId) {
        return { userId: verification.key.userId } as const;
      }

      log?.info?.(
        { error: verification?.error },
        "Better Auth API key validation failed",
      );
      return { userId: undefined } as const;
    }

    if (cookiePresent) {
      const session = await auth.api.getSession({ headers });
      const userId = session?.session.userId;

      if (userId) return { userId } as const;

      log?.info?.("Better Auth session missing or invalid");
      return { userId: undefined } as const;
    }

    log?.info?.("No credentials provided");
    return { userId: undefined } as const;
  })
  .as("scoped");
