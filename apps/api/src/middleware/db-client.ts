import { Elysia } from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth";

import { createDbClient } from "~api/lib/db/client";

// Note: Must be used after authService to ensure userId and organizationId are set
export const dbClient = new Elysia({
  name: "db-client",
})
  .use(authService)
  .resolve(function resolveDbClient({ organizationId, userId }) {
    return {
      dbClient: createDbClient(organizationId!, userId!),
    };
  })
  .as("scoped");

export { type createDbClient } from "~api/lib/db/client";
