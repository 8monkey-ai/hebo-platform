import { createPrismaAdapter } from "@hebo/shared-api/lib/db/postgres";

import { Prisma, PrismaClient } from "~api/generated/prisma/client";
import { redactSensitiveValues } from "~api/lib/redact-provider";
import { ProviderConfig } from "~api/modules/providers/types";

const dbNull = null;

export const prisma = new PrismaClient({
  adapter: createPrismaAdapter("api"),
});

export const createPrismaClient = (organizationId: string, userId: string) => {
  if (!organizationId || !userId) {
    throw new Error("Organization ID and User ID are required");
  }

  const tenantFilters = { deleted_at: dbNull, organization_id: organizationId };

  return prisma.$extends({
    query: {
      $allModels: {
        $allOperations({ args, query, operation }) {
          if (!["create", "createMany", "createManyAndReturn"].includes(operation)) {
            // oxlint-disable no-unsafe-member-access, no-unsafe-assignment, no-unsafe-argument
            const queryArgs = args as any;
            queryArgs.where = { ...queryArgs.where, ...tenantFilters };

            // Prisma's $allOperations hook does not intercept nested relation
            // queries resolved via `include`. We inject tenant + soft-delete
            // filters into `include` entries so related rows are filtered too.
            if (queryArgs.include) {
              for (const [key, value] of Object.entries(queryArgs.include)) {
                if (value === true) {
                  queryArgs.include[key] = { where: tenantFilters };
                }
              }
            }
            // oxlint-enable no-unsafe-member-access, no-unsafe-assignment, no-unsafe-argument
          }
          return query(args);
        },
        create({ args, model, query }) {
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
        update({ args, query }) {
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
        softDelete<T, W>(this: T, where: W) {
          const context = Prisma.getExtensionContext(this);
          // oxlint-disable-next-line no-unsafe-assignment, no-unsafe-member-access, no-unsafe-call, no-unsafe-return
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
        getUnredacted(slug: string) {
          return prisma.provider_configs.findFirst({
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
            return redactSensitiveValues(ProviderConfig, value);
          },
        },
      },
    },
  });
};
