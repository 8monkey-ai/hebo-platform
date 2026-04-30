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

const greptimeUrl = `postgres://${(await getSecret("GREPTIME_HOST")) ?? "localhost"}:4003/public`;

let _client: ReturnType<typeof createBunSqlClient>;

/** Lazily created so BunSqlInstrumentation wraps `bun:sql` before the first `new SQL()` call. */
export const getGreptimeSqlClient = () => (_client ??= createBunSqlClient(greptimeUrl));

export type BunSqlClient = ReturnType<typeof createBunSqlClient>;
