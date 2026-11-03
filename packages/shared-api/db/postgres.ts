import { PrismaPg } from "@prisma/adapter-pg";
import { Resource } from "sst";

import { DEFAULT_DB_IDLE_TIMEOUT_MS, DEFAULT_DB_POOL_MAX } from "./config";

// Resolves the Postgres schema for a service. Override via `POSTGRES_<NAME>_SCHEMA`
// (e.g. `POSTGRES_AUTH_SCHEMA=hebo_auth`) to avoid collisions with reserved schemas
// such as Supabase's built-in `auth` schema.
export const getSchemaName = (name: string) =>
  // oxlint-disable-next-line prefer-nullish-coalescing -- treat empty values as unset
  (process.env[`POSTGRES_${name.toUpperCase()}_SCHEMA`] || name).toLowerCase();

export const getConnectionString = (name: string) => {
  const schema = getSchemaName(name);

  // SST Resource for ECS deployments
  try {
    // oxlint-disable no-unsafe-assignment no-unsafe-member-access
    // @ts-expect-error: HeboDatabase may not be defined
    const db = Resource.HeboDatabase;
    return `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}?sslmode=verify-full&schema=${schema}`;
    // oxlint-enable no-unsafe-assignment no-unsafe-member-access
  } catch {}

  // POSTGRES_URL env var for standalone / self-hosted
  const base = process.env.POSTGRES_URL ?? "postgresql://postgres:password@localhost:5432/hebo";
  return `${base}${base.includes("?") ? "&" : "?"}schema=${schema}`;
};

export const createPrismaAdapter = (name: string, max: number = DEFAULT_DB_POOL_MAX): PrismaPg => {
  return new PrismaPg(
    {
      connectionString: getConnectionString(name),
      max,
      idleTimeoutMillis: DEFAULT_DB_IDLE_TIMEOUT_MS,
    },
    { schema: getSchemaName(name) },
  );
};
