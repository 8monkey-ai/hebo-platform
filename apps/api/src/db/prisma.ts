import { createPrismaAdapter } from "@hebo/shared-api/db/postgres";

import { redactSensitiveValues } from "~api/db/utils";
import { Prisma, PrismaClient } from "~api/generated/prisma/client";
import { ProviderConfigSchema, type ProviderConfig } from "~api/modules/providers/types";

const DB_NULL = null;

const prisma = new PrismaClient({
  adapter: createPrismaAdapter("api"),
});

export const createPrismaClient = (organizationId: string, userId: string) => {
  if (!organizationId || !userId) {
    throw new Error("Organization ID and User ID are required");
  }

  const tenantFilters = { deleted_at: DB_NULL, organization_id: organizationId };

  return prisma.$extends({
    query: {
      $allModels: {
        $allOperations({ args, query, operation }) {
          if (!["create", "createMany", "createManyAndReturn"].includes(operation)) {
            const queryArgs = args as {
              where?: Record<string, unknown>;
              include?: Record<string, unknown>;
            };
            queryArgs.where = { ...queryArgs.where, ...tenantFilters };

            // Prisma's $allOperations hook does not intercept nested relation
            // queries resolved via `include`. We inject tenant + soft-delete
            // filters into `include` entries so related rows are filtered too.
            if (queryArgs.include) {
              for (const [key, value] of Object.entries(queryArgs.include)) {
                if (value) {
                  const opts = value === true ? {} : (value as { where?: Record<string, unknown> });
                  opts.where = { ...opts.where, ...tenantFilters };
                  queryArgs.include[key] = opts;
                }
              }
            }
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
        softDelete(this: unknown, where: unknown) {
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
              deleted_at: DB_NULL,
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
            return redactSensitiveValues(ProviderConfigSchema, value);
          },
        },
      },
    },
  });
};
