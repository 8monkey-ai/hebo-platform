import { Elysia } from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth";

import { createPrismaClient } from "~api/lib/prisma/client";

// Note: Must be used after authService to ensure userId and organizationId are set
export const prismaClient = new Elysia({
  name: "prisma-client",
})
  .use(authService)
  .resolve(function resolvePrismaClient({ organizationId, userId }) {
    return {
      prismaClient: createPrismaClient(organizationId!, userId!),
    };
  })
  .as("scoped");

export { type createPrismaClient } from "~api/lib/prisma/client";
