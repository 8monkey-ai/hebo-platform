import { cors } from "@elysia/cors";
import { openapi } from "@elysia/openapi";
import { opentelemetry } from "@elysia/opentelemetry";
import {
  TranscriptionsBodySchema,
  TranscriptionsSchema,
} from "@hebo-ai/gateway/endpoints/audio-transcriptions";
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
import { jsonRequestBody, transcriptionsRequestBody } from "./lib/openapi";
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
    .get("/", () => "🐵 Hebo AI Gateway says hello!", { detail: { hide: true } })
    .use(cors(CORS_CONFIG))
    .use(
      openapi(
        createOpenapiConfig(
          "Hebo Gateway",
          "OpenAI- and Anthropic-compatible AI Gateway",
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
        detail: {
          tags: ["Models"],
          summary: "List models",
          description: "Lists all models available on Hebo Gateway. No authentication required.",
          security: [],
        },
        response: {
          200: ModelListSchema,
          400: OpenAIErrorSchema,
          500: OpenAIErrorSchema,
        },
      },
    )
    // Documented variant: model IDs contain a slash, so clients URL-encode it (`openai%2Fgpt-oss-20b`).
    .get(
      "/v1/models/:model",
      ({ request }: { request: Request }) => gw.routes["/models"].handler(request),
      {
        detail: {
          tags: ["Models"],
          summary: "Retrieve a model",
          description:
            "Returns a single model by ID, for example `openai/gpt-oss-20b`. No authentication required.",
          security: [],
        },
        response: {
          200: ModelSchema,
          400: OpenAIErrorSchema,
          404: OpenAIErrorSchema,
          500: OpenAIErrorSchema,
        },
      },
    )
    .get(
      "/v1/models/*",
      ({ request }: { request: Request }) => gw.routes["/models"].handler(request),
      {
        detail: { hide: true },
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
            detail: {
              tags: ["Chat"],
              summary: "Create a chat completion",
              description:
                "Creates a model response for a chat conversation. OpenAI Chat Completions compatible. Set `stream: true` to receive server-sent events.",
              requestBody: jsonRequestBody(ChatCompletionsBodySchema),
            },
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
            detail: {
              tags: ["Embeddings"],
              summary: "Create embeddings",
              description:
                "Creates vector embeddings for the input text. OpenAI Embeddings compatible.",
              requestBody: jsonRequestBody(EmbeddingsBodySchema),
            },
            response: {
              200: EmbeddingsSchema,
              400: OpenAIErrorSchema,
              402: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .post(
          "/audio/transcriptions",
          ({ request, prismaClient, organizationId }) =>
            gw.handler(request, { prismaClient, organizationId }),
          {
            parse: "none",
            detail: {
              tags: ["Audio"],
              summary: "Create a transcription",
              description:
                "Transcribes audio into text. Send a multipart `file` upload or base64 `input_audio` in a JSON body. OpenAI Audio Transcriptions compatible.",
              requestBody: transcriptionsRequestBody(TranscriptionsBodySchema),
            },
            response: {
              200: TranscriptionsSchema,
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
            detail: {
              tags: ["Responses"],
              summary: "Create a response",
              description:
                "Creates a model response. OpenAI Responses API compatible. Responses are not stored, so send the full conversation on each request. Set `stream: true` to receive server-sent events.",
              requestBody: jsonRequestBody(ResponsesBodySchema),
            },
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
            detail: {
              tags: ["Messages"],
              summary: "Create a message",
              description:
                "Creates a model response for a conversation. Anthropic Messages API compatible. Set `stream: true` to receive server-sent events.",
              requestBody: jsonRequestBody(MessagesBodySchema),
            },
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
