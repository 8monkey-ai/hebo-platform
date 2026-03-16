import { SQL } from "bun";

import { isProduction } from "../../env";
import { getSecret } from "../../utils/secrets";
import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const getGreptimeConnectionString = async () => {
  const greptimeHost = await getSecret("GreptimeHost");
  if (isProduction && !greptimeHost) {
    throw new Error("Missing required secret: GreptimeHost");
  }
  return `postgres://${greptimeHost ?? "localhost"}:4003/public`;
};

export const createBunSqlClient = (url: string) =>
  new SQL({
    url,
    max: DEFAULT_DB_POOL_MAX,
    idleTimeout: DEFAULT_DB_IDLE_TIMEOUT_MS / 1_000,
  });

export const greptimeSqlClient = createBunSqlClient(await getGreptimeConnectionString());

export type BunSqlClient = InstanceType<typeof SQL>;
