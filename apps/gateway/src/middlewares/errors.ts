import { toAnthropicErrorResponse } from "@hebo-ai/gateway/errors/anthropic";
import { toOpenAIErrorResponse } from "@hebo-ai/gateway/errors/openai";
import { Elysia } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

// HttpError and Elysia's built-in errors (NotFoundError, ParseError,
// ValidationError, InternalServerError) all expose `status` and `code`,
// so we can pick them up structurally.
const getErrorStatusAndCode = (
  error: unknown,
): { status: number; code: string } | undefined => {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return { status: error.status, code: error.code };
  }
};

export const gatewayErrors = new Elysia({ name: "error-handler" })
  .onError(function handleGatewayError({ error, path }) {
    const toErrorResponse = path.endsWith("/messages")
      ? toAnthropicErrorResponse
      : toOpenAIErrorResponse;

    if (error instanceof HttpError)
      return toErrorResponse(error, { status: error.status, statusText: error.code });

    const meta = getErrorStatusAndCode(error);
    if (meta) return toErrorResponse(error, { status: meta.status, statusText: meta.code });

    return toErrorResponse(error, {});
  })
  .as("scoped");
