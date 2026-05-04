import { Elysia } from "elysia";

import { getGreptimeSqlClient, type BunSqlClient } from "@hebo/shared-api/db/greptime";
import { auth } from "@hebo/shared-api/middlewares/auth";

export const greptime = new Elysia({
  name: "greptime-db",
})
  .use(auth)
  .resolve(function resolveGreptimeDb() {
    return {
      greptimeDb: getGreptimeSqlClient(),
    };
  })
  .as("scoped");

export type GreptimeDb = BunSqlClient;
