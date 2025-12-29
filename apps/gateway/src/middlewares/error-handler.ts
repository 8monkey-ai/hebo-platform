import { Elysia, status } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

import { identifyPrismaError } from "~api/lib/db/errors";
import { toOpenAiCompatibleError } from "~gateway/utils/converters";


const upstreamRes = (e: unknown) =>
  (e as { response?: unknown })?.response instanceof Response
    ? (e as { response: Response }).response
    : undefined;

export const errorHandler = new Elysia({ name: "error-handler" })
  .onError(async function handleGatewayError({ code, error }) {
    if (error instanceof HttpError)
      return status(
        error.status,
        toOpenAiCompatibleError(
          error.message,
          "invalid_request_error",
          error.code,
        ),
      );

    // Elysia validation errors
    if (code === "VALIDATION")
      return status(
        400,
        toOpenAiCompatibleError(
          error.message ?? "Invalid request",
          "invalid_request_error",
          "validation_error",
        ),
      );

    // Upstream errors
    const res = upstreamRes(error);
    if (res) {
      try {
        return status(
          res.status,
          (await res.clone().json()) as { error: unknown },
        );
      } catch {
        return status(
          res.status,
          toOpenAiCompatibleError(
            await res.text().catch(() => ""),
            res.status >= 500 ? "server_error" : "invalid_request_error",
          ),
        );
      }
    }

    const prismaError = identifyPrismaError(error);
    if (prismaError)
      return status(
        prismaError.status,
        toOpenAiCompatibleError(
          prismaError.message,
          "invalid_request_error",
          "not_found",
        ),
      );

    return status(
      500,
      toOpenAiCompatibleError(
        error instanceof Error ? error.message : "Internal Server Error",
        "server_error",
        "internal",
      ),
    );
  })
  .as("scoped");
