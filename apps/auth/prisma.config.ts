import { type PrismaConfig } from "prisma/config";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.POSTGRES_URL ??
      (await import("@hebo/shared-api/db/postgres")).getConnectionString("auth"),
  },
} satisfies PrismaConfig;
