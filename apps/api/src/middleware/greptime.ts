import { Elysia } from "elysia";

import { greptimeSqlClient, type BunSqlClient } from "@hebo/shared-api/lib/db/greptime";
import { authService } from "@hebo/shared-api/middlewares/auth";

export const greptimeDb = new Elysia({
  name: "greptime-db",
})
  .use(authService)
  .resolve(function resolveGreptimeDb() {
    return {
      greptimeDb: greptimeSqlClient,
    };
  })
  .as("scoped");

export type GreptimeDb = BunSqlClient;
