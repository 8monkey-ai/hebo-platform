import { PrismaPg } from "@prisma/adapter-pg";
import { Resource } from "sst";

import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

const appendSchema = (base: string, schema: string) =>
  `${base}${base.includes("?") ? "&" : "?"}schema=${schema.toLowerCase()}`;

export const getConnectionString = (schema: string) => {
  try {
    // oxlint-disable no-unsafe-assignment no-unsafe-member-access
    // @ts-expect-error: HeboDatabase may not be defined
    const db = Resource.HeboDatabase;
    return appendSchema(
      `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}?sslmode=verify-full`,
      schema,
    );
    // oxlint-enable no-unsafe-assignment no-unsafe-member-access
  } catch {
    const base = process.env.DATABASE_URL ?? "postgresql://postgres:password@localhost:5432/hebo";
    return appendSchema(base, schema);
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
