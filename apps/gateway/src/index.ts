import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import {
  ChatCompletionsBodySchema,
  ChatCompletionsChunkSchema,
  ChatCompletionsSchema,
} from "@hebo-ai/gateway/endpoints/chat-completions";
import {
  EmbeddingsBodySchema,
  EmbeddingsSchema,
} from "@hebo-ai/gateway/endpoints/embeddings";
import {
  ModelListSchema,
  ModelSchema,
} from "@hebo-ai/gateway/endpoints/models";
import { OpenAIErrorSchema } from "@hebo-ai/gateway/errors/openai";
import Elysia from "elysia";

import { corsConfig } from "@hebo/shared-api/lib/cors";
import { getOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { authService } from "@hebo/shared-api/middlewares/auth";

import { dbClient } from "~api/middleware/db-client";

import { basePath, gw } from "./gateway-config";
import { errorHandler } from "./middlewares/error-handler";

const PORT = Number(process.env.PORT ?? 3002);
const GATEWAY_URL = process.env.GATEWAY_URL ?? `http://localhost:${PORT}`;

export const createGateway = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-gateway")))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(corsConfig))
    .use(
      openapi(
        getOpenapiConfig(
          "Hebo Gateway",
          "OpenAI-compatible AI Gateway",
          GATEWAY_URL,
          "0.1.0",
        ),
      ),
    )
    .use(errorHandler)
    // Public routes (no authentication required)
    .get(
      "/v1/models",
      (({ request }: { request: Request }) =>
        gw.routes["/models"].handler(request)) as any,
      {
        response: {
          200: ModelListSchema,
          400: OpenAIErrorSchema,
          500: OpenAIErrorSchema,
        },
      },
    )
    .get(
      "/v1/models/*",
      (({ request }: { request: Request }) =>
        gw.routes["/models"].handler(request)) as any,
      {
        response: {
          200: ModelSchema,
          400: OpenAIErrorSchema,
          404: OpenAIErrorSchema,
          500: OpenAIErrorSchema,
        },
      },
    )
    .use(authService)
    .group(basePath, { isSignedIn: true }, (app) =>
      app
        .use(dbClient)
        .post(
          "/chat/completions",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- https://github.com/elysiajs/elysia/issues/1721
          (({ request, dbClient, organizationId }: any) =>
            gw.handler(request, { dbClient, organizationId })) as any,
          {
            parse: "none",
            body: ChatCompletionsBodySchema,
            response: {
              200: ChatCompletionsSchema.or(ChatCompletionsChunkSchema),
              400: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .post(
          "/embeddings",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- https://github.com/elysiajs/elysia/issues/1721
          (({ request, dbClient, organizationId }: any) =>
            gw.handler(request, { dbClient, organizationId })) as any,
          {
            parse: "none",
            body: EmbeddingsBodySchema,
            response: {
              200: EmbeddingsSchema,
              400: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        ),
    );

if (import.meta.main) {
  const app = createGateway().listen(PORT);
  console.log(`🐵 Hebo Gateway running at ${app.server!.url}`);
}

export type Gateway = ReturnType<typeof createGateway>;
