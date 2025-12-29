import { Elysia } from "elysia";

import { createDbClient } from "~api/lib/db/client";

// Note: Must be used after authService to ensure userId is set
export const dbClient = new Elysia({
  name: "db-client",
})
  .resolve(function resolveDbClient(ctx) {
    return {
      dbClient: createDbClient((ctx as unknown as { userId: string }).userId),
    };
  })
  .as("scoped");

export { type createDbClient } from "../lib/db/client";
