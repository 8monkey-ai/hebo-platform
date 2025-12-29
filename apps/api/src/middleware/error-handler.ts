import { Elysia, status } from "elysia";

import { HttpError } from "@hebo/shared-api/errors";

import { identifyPrismaError } from "~api/lib/db/errors";

export const errorHandler = new Elysia({ name: "error-handler" })
  .onError(function handleApiError({ error }) {
    if (error instanceof HttpError) {
      return status(error.status, error.message);
    }
    const prismaError = identifyPrismaError(error);
    if (prismaError) {
      return status(prismaError.status, prismaError.message);
    }
  })
  .as("scoped");
