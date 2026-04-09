import { PrismaPg } from "@prisma/adapter-pg";

import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const getConnectionString = (schema: string) => {
  const base = process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/hebo";
  return `${base}${base.includes("?") ? "&" : "?"}schema=${schema.toLowerCase()}`;
};

export const createPrismaAdapter = (
  schema: string,
  max: number = DEFAULT_DB_POOL_MAX,
): PrismaPg => {
  return new PrismaPg(
    {
      connectionString: getConnectionString(schema),
      max,
      idleTimeoutMillis: DEFAULT_DB_IDLE_TIMEOUT_MS,
    },
    { schema: schema.toLowerCase() },
  );
};
