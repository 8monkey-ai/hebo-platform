import { treaty } from "@elysiajs/eden";
import ky, { HTTPError } from "ky";

import { authService } from "~console/lib/auth";
import { isDevLocal } from "~console/lib/env";

import type { Api } from "~api";
import type { Gateway } from "~gateway";

const apiUrl = isDevLocal
  ? "http://localhost:5173/api"
  : import.meta.env.VITE_API_URL || "http://localhost:3001";

export const gatewayUrl = isDevLocal
  ? "http://localhost:5173/gateway"
  : import.meta.env.VITE_GATEWAY_URL || "http://localhost:3002";

export const kyFetch = ky.extend({
  timeout: 60_000, // 60 seconds
  throwHttpErrors: false,
  hooks: {
    beforeRequest: [
      (request) => {
        request.headers.set(
          "x-stack-access-token",
          authService.getAccessToken()!,
        );
      },
    ],
    afterResponse: [
      async (_req, _opts, res) => {
        // Successful response, all good
        if (res.ok) return res;

        // Don't throw on application-level errors
        if ([400, 404, 409, 422].includes(res.status)) return res;

        // Else, unpack error to surface in the UI
        const body = (res.headers.get("content-type") ?? "").includes("json")
          ? await res.json()
          : await res.text();
        const err = new HTTPError(res, _req, _opts);

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

        throw err;
      },
    ],
  },
});

export const api = treaty<Api>(apiUrl, {
  // Automatic auth header, retries, timeouts & error throwing
  fetcher: kyFetch,
}).v1;

export const gateway = treaty<Gateway>(gatewayUrl, {
  // Automatic auth header, retries, timeouts & error throwing
  fetcher: kyFetch,
}).v1;
