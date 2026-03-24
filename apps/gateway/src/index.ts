import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import {
  ChatCompletionsBodySchema,
  ChatCompletionsChunkSchema,
  ChatCompletionsSchema,
} from "@hebo-ai/gateway/endpoints/chat-completions";
import {
  ConversationCreateParamsSchema,
  ConversationDeletedSchema,
  ConversationItemListSchema,
  ConversationItemSchema,
  ConversationItemsAddBodySchema,
  ConversationListSchema,
  ConversationSchema,
  ConversationUpdateBodySchema,
} from "@hebo-ai/gateway/endpoints/conversations";
import { EmbeddingsBodySchema, EmbeddingsSchema } from "@hebo-ai/gateway/endpoints/embeddings";
import { ModelListSchema, ModelSchema } from "@hebo-ai/gateway/endpoints/models";
import { OpenAIErrorSchema } from "@hebo-ai/gateway/errors/openai";
import { Elysia } from "elysia";

import { corsConfig } from "@hebo/shared-api/lib/cors";
import { getOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { authService } from "@hebo/shared-api/middlewares/auth";
import { logging } from "@hebo/shared-api/middlewares/logging";

import { prisma } from "~api/middleware/prisma";

import { basePath, gw } from "./gateway-config";
import { errorHandler } from "./middlewares/error-handler";
import { orgContext } from "./services/org-scoped-storage";

const PORT = Number(process.env.PORT ?? 3002);
const GATEWAY_URL = process.env.GATEWAY_URL ?? `http://localhost:${PORT}`;

export const createGateway = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-gateway")))
    .use(logging("hebo-gateway"))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(corsConfig))
    .use(
      openapi(
        getOpenapiConfig("Hebo Gateway", "OpenAI-compatible AI Gateway", GATEWAY_URL, "0.1.0"),
      ),
    )
    .use(errorHandler)
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
    .use(authService)
    .group(basePath, { isSignedIn: true }, (app) =>
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
          "/conversations",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            parse: "none",
            body: ConversationCreateParamsSchema,
            response: {
              200: ConversationSchema,
              400: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .get(
          "/conversations",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            response: {
              200: ConversationListSchema,
              400: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .get(
          "/conversations/:id",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            response: {
              200: ConversationSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .post(
          "/conversations/:id",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            parse: "none",
            body: ConversationUpdateBodySchema,
            response: {
              200: ConversationSchema,
              400: OpenAIErrorSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .delete(
          "/conversations/:id",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            response: {
              200: ConversationDeletedSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .get(
          "/conversations/:id/items",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            response: {
              200: ConversationItemListSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .post(
          "/conversations/:id/items",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            parse: "none",
            body: ConversationItemsAddBodySchema,
            response: {
              200: ConversationItemListSchema,
              400: OpenAIErrorSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .get(
          "/conversations/:id/items/:itemId",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            response: {
              200: ConversationItemSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        )
        .delete(
          "/conversations/:id/items/:itemId",
          ({ request, prismaClient, organizationId }) =>
            orgContext.run(organizationId, () =>
              gw.handler(request, { prismaClient, organizationId }),
            ),
          {
            response: {
              200: ConversationSchema,
              404: OpenAIErrorSchema,
              500: OpenAIErrorSchema,
            },
          },
        ),
    );

if (import.meta.main) {
  const app = createGateway().listen({ port: PORT, idleTimeout: 0 }); // Prevent idle timeout
  console.log(`🐵 Hebo Gateway running at ${app.server!.url}`);
}

export type Gateway = ReturnType<typeof createGateway>;
