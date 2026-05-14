import { getSecret } from "../utils/secret";
import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const GREPTIME_HOST = (await getSecret("GREPTIME_HOST")) ?? "localhost";

export const greptimeSqlClient = new (require("bun") as typeof Bun).SQL({
  url: `postgres://${GREPTIME_HOST}:4003/public`,
  max: DEFAULT_DB_POOL_MAX,
  idleTimeout: DEFAULT_DB_IDLE_TIMEOUT_MS / 1_000,
});

export type BunSqlClient = typeof greptimeSqlClient;
