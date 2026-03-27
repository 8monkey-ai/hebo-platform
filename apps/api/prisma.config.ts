import { type PrismaConfig } from "prisma/config";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      (await import("@hebo/shared-api/lib/db/postgres")).getConnectionString("api"),
  },
} satisfies PrismaConfig;
