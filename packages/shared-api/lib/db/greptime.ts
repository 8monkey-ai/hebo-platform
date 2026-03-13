import { SQL } from "bun";

import { getSecret } from "../../utils/secrets";
import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const getGreptimeConnectionString = async () => {
  const value = await getSecret("GreptimeEndpoint");
  if (value) {
    return `postgres://${new URL(value).hostname}:4003/public`;
  }

  return "postgres://localhost:4003/public";
};

export const createBunSqlClient = (url: string) =>
  new SQL({
    url,
    max: DEFAULT_DB_POOL_MAX,
    idleTimeout: DEFAULT_DB_IDLE_TIMEOUT_MS / 1_000,
  });

export const greptimeSqlClient = createBunSqlClient(await getGreptimeConnectionString());

export type BunSqlClient = InstanceType<typeof SQL>;
