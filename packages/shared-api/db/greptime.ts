import { getSecret } from "../utils/secret";
import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const getGreptimeConnectionString = async () => {
  return `postgres://${(await getSecret("GREPTIME_HOST")) ?? "localhost"}:4003/public`;
};

export const createBunSqlClient = (url: string) => {
  const { SQL } = require("bun") as typeof Bun;
  return new SQL({
    url,
    max: DEFAULT_DB_POOL_MAX,
    idleTimeout: DEFAULT_DB_IDLE_TIMEOUT_MS / 1_000,
  });
};

export const greptimeSqlClient = createBunSqlClient(await getGreptimeConnectionString());

export type BunSqlClient = ReturnType<typeof createBunSqlClient>;
