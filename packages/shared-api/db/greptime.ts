import { getSecret } from "../utils/secret";
import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

const createBunSqlClient = (url: string) => {
  const { SQL } = require("bun") as typeof Bun;
  return new SQL({
    url,
    max: DEFAULT_DB_POOL_MAX,
    idleTimeout: DEFAULT_DB_IDLE_TIMEOUT_MS / 1_000,
  });
};

export const GREPTIME_HOST = (await getSecret("GREPTIME_HOST")) ?? "localhost";

let _client: ReturnType<typeof createBunSqlClient>;

/** Lazily created so BunSqlInstrumentation wraps `bun:sql` before the first `new SQL()` call. */
export const getGreptimeSqlClient = () =>
  (_client ??= createBunSqlClient(`postgres://${GREPTIME_HOST}:4003/public`));

export type BunSqlClient = ReturnType<typeof createBunSqlClient>;
