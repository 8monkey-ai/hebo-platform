import { PrismaPg } from "@prisma/adapter-pg";
import { Resource } from "sst";

export const getConnectionString = (schema: string) => {
  try {
    // @ts-expect-error: HeboDatabase may not be defined
    const db = Resource.HeboDatabase;
    return `postgresql://${db.username}:${db.password}@${db.host}:${db.port}/${db.database}?sslmode=verify-full&schema=${schema.toLowerCase()}`;
  } catch {
    // FUTURE: keep in sync with dev:infra:up script once updated
    return `postgresql://postgres:password@localhost:5432/local?schema=${schema.toLowerCase()}`;
  }
};

export const createPrismaAdapter = (
  schema: string,
  max: number = 25,
): PrismaPg => {
  return new PrismaPg(
    { connectionString: getConnectionString(schema), max },
    { schema: schema.toLowerCase() },
  );
};
