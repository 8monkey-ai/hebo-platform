import { Elysia } from "elysia";

import { auth } from "@hebo/shared-api/middlewares/auth";

import { createPrismaClient } from "~api/lib/prisma/client";

export const prisma = new Elysia({
  name: "prisma-client",
})
  .use(auth)
  .resolve(function resolvePrismaClient({ organizationId, userId }) {
    return {
      prismaClient: createPrismaClient(organizationId!, userId!),
    };
  })
  .as("scoped");

export { type createPrismaClient } from "~api/lib/prisma/client";
