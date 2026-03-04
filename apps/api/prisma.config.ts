const lazyGetConnectionString = (schema: string) => {
  return require("@hebo/shared-api/lib/db/connection").getConnectionString(schema);
};

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? lazyGetConnectionString("api"),
  },
};
