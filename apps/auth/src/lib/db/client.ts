import { PrismaPg } from "@prisma/adapter-pg";

import { getConnectionString } from "@hebo/shared-api/lib/db/connection";

import { PrismaClient } from "~auth/generated/prisma/client";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getConnectionString(), max: 25 }),
});
