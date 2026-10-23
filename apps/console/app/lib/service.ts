import { treaty } from "@elysia/eden";
import ky, { HTTPError } from "ky";
import type { Api } from "~api";
import type { Gateway } from "~gateway";

import { authService } from "~console/lib/auth";
import { apiUrl, gatewayUrl } from "~console/lib/env";

export const kyFetch = ky.extend({
  credentials: "include",
  timeout: 60_000, // 60 seconds
  throwHttpErrors: (status) => ![400, 404, 409, 422].includes(status),
  hooks: {
    beforeRequest: [
      async () => {
        const signedIn = await authService.ensureSignedIn();
        if (!signedIn) {
          throw new DOMException("Session expired, redirecting to sign-in", "AbortError");
        }
      },
    ],
    beforeError: [
      ({ error: err }) => {
        if (!(err instanceof HTTPError)) return err;
        const body: unknown = err.data;

        if (typeof body === "string") err.message = body;

        if (typeof body === "object" && body) {
          // ElysiaJS structured errors
          if ("stack" in body) {
            err.stack = String(body.stack);
          }

          // Direct message (common error format)
          if ("message" in body) {
            err.message = String(body.message);
          }
          // OpenAI-style: { error: { message: string } }
          else if (
            "error" in body &&
            typeof body.error === "object" &&
            body.error &&
            "message" in body.error
          ) {
            err.message = String(body.error.message);
          }
        }

        return err;
      },
    ],
  },
});

export const api = treaty<Api>(apiUrl, {
  // Automatic auth header, retries, timeouts & error throwing
  fetcher: kyFetch as unknown as typeof fetch,
}).v1;

export const gateway = treaty<Gateway>(gatewayUrl, {
  // Automatic auth header, retries, timeouts & error throwing
  fetcher: kyFetch as unknown as typeof fetch,
}).v1;
