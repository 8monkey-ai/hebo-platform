import { PrismaPg } from "@prisma/adapter-pg";
import { Resource } from "sst";

import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

export const getConnectionString = (schema: string) => {
  try {
    // @ts-expect-error: HeboDatabase may not be defined
    const db = Resource.HeboDatabase;
    return `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}?sslmode=verify-full&schema=${schema.toLowerCase()}`;
  } catch {
    // Self-hosted: use DATABASE_URL env var if available
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      url.searchParams.set("schema", schema.toLowerCase());
      return url.toString();
    }
    // FUTURE: keep in sync with dev:infra:up script once updated
    return `postgresql://postgres:password@localhost:5432/local?schema=${schema.toLowerCase()}`;
  }
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
