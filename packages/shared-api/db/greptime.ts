import { getSecret } from "../utils/secret";
import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const GREPTIME_HOST = (await getSecret("GREPTIME_HOST")) ?? "localhost";

let _client: Bun.SQL;

/** Lazily created so BunSqlInstrumentation wraps `bun:sql` before the first `new SQL()` call. */
export const getGreptimeSqlClient = () =>
  (_client ??= new (require("bun") as typeof Bun).SQL({
    url: `postgres://${GREPTIME_HOST}:4003/public`,
    max: DEFAULT_DB_POOL_MAX,
    idleTimeout: DEFAULT_DB_IDLE_TIMEOUT_MS / 1_000,
  }));

export type BunSqlClient = typeof _client;
