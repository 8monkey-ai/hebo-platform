import { toAnthropicErrorResponse } from "@hebo-ai/gateway/errors/anthropic";
import { toOpenAIErrorResponse } from "@hebo-ai/gateway/errors/openai";
import { Elysia } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

export const gatewayErrors = new Elysia({ name: "error-handler" })
  .onError(function handleGatewayError({ error, path }) {
    const toErrorResponse = path.endsWith("/messages")
      ? toAnthropicErrorResponse
      : toOpenAIErrorResponse;

    if (error instanceof HttpError) return toErrorResponse(error, { status: error.status });

    return toErrorResponse(error, {});
  })
  .as("scoped");
