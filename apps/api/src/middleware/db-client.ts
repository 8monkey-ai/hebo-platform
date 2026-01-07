import { Elysia } from "elysia";

import { createDbClient } from "~api/lib/db/client";

// Note: Must be used after authService to ensure userId, organizationId and teamIds are set
export const dbClient = new Elysia({
  name: "db-client",
})
  .resolve(function resolveDbClient(ctx) {
    const { organizationId, teamIds, userId } = ctx as unknown as {
      organizationId: string;
      userId: string;
      teamIds: string[];
    };
    return {
      dbClient: createDbClient(organizationId, teamIds, userId),
    };
  })
  .as("scoped");

export { type createDbClient } from "~api/lib/db/client";
