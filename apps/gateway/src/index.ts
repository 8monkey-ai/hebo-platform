import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { opentelemetry } from "@elysia/opentelemetry";
import {
  ChatCompletionsBodySchema,
  ChatCompletionsChunkSchema,
  ChatCompletionsSchema,
} from "@hebo-ai/gateway/endpoints/chat-completions";
import { EmbeddingsBodySchema, EmbeddingsSchema } from "@hebo-ai/gateway/endpoints/embeddings";
import { MessagesBodySchema, MessagesSchema } from "@hebo-ai/gateway/endpoints/messages";
import { ModelListSchema, ModelSchema } from "@hebo-ai/gateway/endpoints/models";
import { ResponsesBodySchema, ResponsesSchema } from "@hebo-ai/gateway/endpoints/responses";
import { AnthropicErrorSchema } from "@hebo-ai/gateway/errors/anthropic";
import { OpenAIErrorSchema } from "@hebo-ai/gateway/errors/openai";
import { FORWARD_HEADER_ALLOWLIST, RESPONSE_HEADER_ALLOWLIST } from "@hebo-ai/gateway/utils";
import { Elysia } from "elysia";

import { CORS_CONFIG } from "@hebo/shared-api/lib/cors";
import { getLogger } from "@hebo/shared-api/lib/logger";
import { createOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { auth } from "@hebo/shared-api/middlewares/auth";
import { logging } from "@hebo/shared-api/middlewares/logging";
import { withPort } from "@hebo/shared-api/utils/url";

import { prisma } from "~api/middlewares/prisma";

import { BASE_PATH, gw } from "./gateway";
import { gatewayErrors } from "./middlewares/errors";

const PORT = Number(process.env.PORT ?? 8522);
const WORKERS = Number(process.env.WORKERS);
const BASE_URL = process.env.BASE_URL ?? "http://localhost";

export const createGateway = () =>
  new Elysia()
    .use(
      opentelemetry(
        getOtelConfig("hebo-gateway", FORWARD_HEADER_ALLOWLIST, RESPONSE_HEADER_ALLOWLIST),
      ),
    )
    .use(logging(getLogger("hebo-gateway")))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(CORS_CONFIG))
    .use(
      openapi(
        createOpenapiConfig(
          "Hebo Gateway",
          "OpenAI-compatible AI Gateway",
          withPort(BASE_URL, PORT),
          "0.1.0",
        ),
      ),
    )
    .use(gatewayErrors)
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
        )
        .post(
          "/responses",
          ({ request, prismaClient, organizationId }) =>
            gw.handler(request, { prismaClient, organizationId }),
          {
            parse: "none",
            body: ResponsesBodySchema,
            response: {
              200: ResponsesSchema,
              400: OpenAIErrorSchema,
              402: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .post(
          "/messages",
          ({ request, prismaClient, organizationId }) =>
            gw.handler(request, { prismaClient, organizationId }),
          {
            parse: "none",
            body: MessagesBodySchema,
            response: {
              200: MessagesSchema,
              400: AnthropicErrorSchema,
              402: AnthropicErrorSchema,
              500: AnthropicErrorSchema,
            },
          },
        ),
    );

if (import.meta.main) {
  serve(createGateway, PORT, "Hebo Gateway", { idleTimeout: 0, workers: WORKERS });
}

export type Gateway = ReturnType<typeof createGateway>;
