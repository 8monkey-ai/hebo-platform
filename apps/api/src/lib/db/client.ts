import { PrismaPg } from "@prisma/adapter-pg";

import { getConnectionString } from "@hebo/shared-api/lib/db/connection";

import { PrismaClient } from "~api/generated/prisma/client";
import type { ProviderConfig } from "~api/modules/providers/types";
import { redactProviderConfigValue } from "~api/utils/redact-provider";

// eslint-disable-next-line unicorn/no-null
const dbNull = null;

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: getConnectionString(), max: 25 }),
});

export const createDbClient = (userId: string) => {
  if (!userId) {
    throw new Error("User ID is required");
  }
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, operation }) {
          if (operation !== "create") {
            const a = args as { where?: Record<string, unknown> };
            a.where = { ...a.where, created_by: userId, deleted_at: dbNull };
          }

          return query(args);
        },
        async create({ args, model, query }) {
          args.data = {
            ...args.data,
            created_by: userId,
            updated_by: userId,
          };

          if (model === "agents" && args.data.branches?.create) {
            const existing = args.data.branches.create;
            args.data.branches.create = Array.isArray(existing)
              ? existing.map((item) => ({
                  ...item,
                  created_by: userId,
                  updated_by: userId,
                }))
              : {
                  ...existing,
                  created_by: userId,
                  updated_by: userId,
                };
          }
          return query(args);
        },
        async update({ args, query }) {
          args.data = {
            ...args.data,
            updated_by: userId,
          };
          return query(args);
        },
      },
    },
    model: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async softDelete<T>(this: any, where: T) {
          return this.update({
            where,
            data: { deleted_by: userId, deleted_at: new Date() },
          });
        },
      },
      provider_configs: {
        async getUnredacted(slug: string) {
          return prisma.provider_configs.findFirstOrThrow({
            where: {
              provider_slug: slug,
              created_by: userId,
              deleted_at: dbNull,
            },
          });
        },
      },
    },
    result: {
      provider_configs: {
        value: {
          needs: { value: true },
          compute({ value }: { value: ProviderConfig }) {
            return redactProviderConfigValue(value);
          },
        },
      },
    },
  });
};
