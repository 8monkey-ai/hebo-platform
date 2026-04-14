import { type PrismaConfig } from "prisma/config";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: (await import("@hebo/shared-api/db/postgres")).getConnectionString("api"),
  },
} satisfies PrismaConfig;
