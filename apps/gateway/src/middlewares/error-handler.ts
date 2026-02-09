import { toOpenAIErrorResponse } from "@hebo-ai/gateway/errors/openai";
import { Elysia } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

export const errorHandler = new Elysia({ name: "error-handler" })
  .onError(async function handleGatewayError({ error }) {
    if (error instanceof HttpError)
      return toOpenAIErrorResponse(error, { status: error.status });

    return toOpenAIErrorResponse(error);
  })
  .as("scoped");
