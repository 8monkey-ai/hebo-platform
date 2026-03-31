import { Elysia, status } from "elysia";

import { HttpError, identifyPrismaError } from "@hebo/shared-api/errors";

export const errors = new Elysia({ name: "error-handler" })
  .onError(function handleApiError({ error }) {
    const httpError = error instanceof HttpError ? error : identifyPrismaError(error);
    if (httpError) return status(httpError.status, httpError.message);
  })
  .as("scoped");
