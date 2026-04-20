import { GatewayError } from "@hebo-ai/gateway";
import { toAnthropicErrorResponse } from "@hebo-ai/gateway/errors/anthropic";
import { toOpenAIErrorResponse } from "@hebo-ai/gateway/errors/openai";
import { Elysia } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

function getResponseInit(error: unknown): ResponseInit {
  if (error instanceof HttpError) return { status: error.status };
  if (error instanceof GatewayError) return { status: error.status, statusText: error.statusText };
  return { status: 500 };
}

export const gatewayErrors = new Elysia({ name: "error-handler" })
  .onError(function handleGatewayError({ error, path }) {
    const toErrorResponse = path.endsWith("/messages")
      ? toAnthropicErrorResponse
      : toOpenAIErrorResponse;

    return toErrorResponse(error, getResponseInit(error));
  })
  .as("scoped");
