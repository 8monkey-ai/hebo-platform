import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import {
  ChatCompletionsBodySchema,
  ChatCompletionsChunkSchema,
  ChatCompletionsSchema,
} from "@hebo-ai/gateway/endpoints/chat-completions";
import { EmbeddingsBodySchema, EmbeddingsSchema } from "@hebo-ai/gateway/endpoints/embeddings";
import { ModelListSchema, ModelSchema } from "@hebo-ai/gateway/endpoints/models";
import { OpenAIErrorSchema } from "@hebo-ai/gateway/errors/openai";
import { Elysia } from "elysia";

import { CORS_CONFIG } from "@hebo/shared-api/lib/cors";
import { createOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { auth } from "@hebo/shared-api/middlewares/auth";
import { logging } from "@hebo/shared-api/middlewares/logging";

import { prisma } from "~api/middlewares/prisma";

import { BASE_PATH, gw } from "./gateway";
import { openaiErrors } from "./middlewares/errors";

const PORT = Number(process.env.PORT ?? 3002);
const WORKERS = Number(process.env.WORKERS) || undefined;
const GATEWAY_URL = process.env.GATEWAY_URL ?? `http://localhost:${PORT}`;

export const createGateway = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-gateway")))
    .use(logging("hebo-gateway"))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(CORS_CONFIG))
    .use(
      openapi(
        createOpenapiConfig("Hebo Gateway", "OpenAI-compatible AI Gateway", GATEWAY_URL, "0.1.0"),
      ),
    )
    .use(openaiErrors)
    // Public routes (no authentication required)
    .get(
      "/v1/models",
      ({ request }: { request: Request }) => gw.routes["/models"].handler(request),
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
      ({ request }: { request: Request }) => gw.routes["/models"].handler(request),
      {
        response: {
          200: ModelSchema,
          400: OpenAIErrorSchema,
          404: OpenAIErrorSchema,
          500: OpenAIErrorSchema,
        },
      },
    )
    .use(auth)
    .group(BASE_PATH, { isSignedIn: true }, (app) =>
      app
        .use(prisma)
        .post(
          "/chat/completions",
          ({ request, prismaClient, organizationId }) =>
            gw.handler(request, { prismaClient, organizationId }),
          {
            parse: "none",
            body: ChatCompletionsBodySchema,
            response: {
              200: ChatCompletionsSchema.or(ChatCompletionsChunkSchema),
              400: OpenAIErrorSchema,
              402: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .post(
          "/embeddings",
          ({ request, prismaClient, organizationId }) =>
            gw.handler(request, { prismaClient, organizationId }),
          {
            parse: "none",
            body: EmbeddingsBodySchema,
            response: {
              200: EmbeddingsSchema,
              400: OpenAIErrorSchema,
              402: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        ),
    );

if (import.meta.main) {
  serve(createGateway, PORT, "Hebo Gateway", { idleTimeout: 0, workers: WORKERS });
}

export type Gateway = ReturnType<typeof createGateway>;
