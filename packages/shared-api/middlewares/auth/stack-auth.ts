import { type Logger } from "@bogeychan/elysia-logger/types";
import { bearer } from "@elysiajs/bearer";
import { Elysia } from "elysia";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { BadRequestError } from "../../errors";
import { getSecret } from "../../utils/secrets";

export const projectId = await getSecret("StackProjectId", false);
export const secretServerKey = await getSecret("StackSecretServerKey", false);

const jwks = createRemoteJWKSet(
  new URL(
    `https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.json`,
  ),
);

const verifyJwt = async (
  token: string,
  log: Logger,
): Promise<string | undefined> => {
  try {
    const { payload } = await jwtVerify(token, jwks);
    return payload.sub;
  } catch (error) {
    log.info({ err: error }, "JWT verification failed");
  }
};

const checkApiKey = async (
  key: string,
  log: Logger,
): Promise<string | undefined> => {
  const res = await fetch(
    "https://api.stack-auth.com/api/v1/user-api-keys/check",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-stack-access-type": "server",
        "x-stack-project-id": projectId,
        "x-stack-secret-server-key": secretServerKey,
      },
      body: JSON.stringify({ api_key: key }),
    },
  );
  if (res.status === 200) {
    const { user_id } = await res.json();
    return user_id;
  } else log.info(res, "API Key check failed");
};

// FUTURE: Cache the user id lookup
export const authServiceStackAuth = new Elysia({
  name: "authenticate-user-stack-auth",
})
  .use(bearer())
  .resolve(async function resolveAuthUser(ctx) {
    const jwt = ctx.headers["x-stack-access-token"] as string | undefined;
    const apiKey = ctx.bearer;
    const log = (ctx as unknown as { log: Logger }).log;

    if (apiKey && jwt) {
      throw new BadRequestError(
        "Provide exactly one credential: Bearer API Key or JWT Header",
      );
    }

    if (apiKey) return { userId: await checkApiKey(apiKey, log) } as const;
    if (jwt) return { userId: await verifyJwt(jwt, log) } as const;

    log.info("No credentials provided");
    return { userId: undefined } as const;
  })
  .as("scoped");
