import { createPrismaAdapter } from "@hebo/shared-api/lib/db/connection";

import { Prisma, PrismaClient } from "~api/generated/prisma/client";
import { redactProviderConfigValue } from "~api/lib/redact-provider";
import type { ProviderConfig } from "~api/modules/providers/types";

// eslint-disable-next-line unicorn/no-null
const dbNull = null;

export const prisma = new PrismaClient({
  adapter: createPrismaAdapter("api"),
});

export const createDbClient = (
  organizationId: string,
  teamIds: string[] | undefined,
  userId: string,
) => {
  if (!organizationId || !userId) {
    throw new Error("Organization ID and User ID are required");
  }
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query, operation, model }) {
          if (operation !== "create") {
            const a = args as { where?: Record<string, unknown> };
            a.where = {
              ...a.where,
              deleted_at: dbNull,
              organization_id: organizationId,
            };

            if (model === "agents" || model === "branches") {
              a.where = {
                ...a.where,
                team_id: { in: teamIds },
              };
            }
          }

          return query(args);
        },
        async create({ args, model, query }) {
          args.data = {
            ...args.data,
            created_by: userId,
            updated_by: userId,
            organization_id: organizationId,
          };

          if (model === "agents" && args.data.branches?.create) {
            const existing = args.data.branches.create;
            args.data.branches.create = Array.isArray(existing)
              ? existing.map((item) => ({
                  ...item,
                  created_by: userId,
                  updated_by: userId,
                  organization_id: organizationId,
                }))
              : {
                  ...existing,
                  created_by: userId,
                  updated_by: userId,
                  organization_id: organizationId,
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
        async softDelete<T, W>(this: T, where: W) {
          const context = Prisma.getExtensionContext(this);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (context as any).update({
            where,
            data: {
              deleted_by: userId,
              deleted_at: new Date(),
            },
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
              organization_id: organizationId,
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
