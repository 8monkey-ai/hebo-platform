import { Elysia, status } from "elysia";
import { z } from "zod";

import type { Prisma } from "~api/generated/prisma/client";
import { prisma } from "~api/middlewares/prisma";

import {
  type ModelsConfig,
  ProviderSchema,
  ProviderConfigSchema,
  ProviderSlugSchema,
  SUPPORTED_PROVIDERS,
} from "./types";

export const providersModule = new Elysia({
  prefix: "/providers",
})
  .use(prisma)
  .get(
    "/",
    async ({ prismaClient, query }) => {
      const providerConfigs = await prismaClient.provider_configs.findMany();

      let providers = Object.entries(SUPPORTED_PROVIDERS).map(([slug, { name }]) => ({
        slug,
        name,
        config: providerConfigs.find((p) => p.provider_slug === slug)?.value,
      }));

      if (query.configured) {
        providers = providers.filter((p) => p.config !== undefined);
      }

      return status(200, providers);
    },
    {
      query: z.object({
        configured: z.coerce.boolean().default(false).optional(),
      }),
      response: { 200: z.array(ProviderSchema) },
    },
  )
  .put(
    "/:slug/config",
    async ({ body, prismaClient, params }) => {
      const existing = await prismaClient.provider_configs.findFirst({
        where: { provider_slug: params.slug },
        select: { id: true },
      });

      const providerConfig = await prismaClient.provider_configs.create({
        data: {
          provider_slug: params.slug,
          value: body,
        } as unknown as Prisma.provider_configsCreateInput,
      });

      if (existing) {
        await prismaClient.provider_configs.softDelete({ id: existing.id });
      }

      return status(201, providerConfig.value);
    },
    {
      body: ProviderConfigSchema,
      params: z.object({ slug: ProviderSlugSchema }),
      response: { 201: ProviderConfigSchema },
    },
  )
  .delete(
    "/:slug/config",
    async ({ prismaClient, params }) => {
      const { id } = await prismaClient.provider_configs.findFirstOrThrow({
        where: { provider_slug: params.slug },
        select: { id: true },
      });

      const branches = await prismaClient.branches.findMany();

      const affectedBranches = branches.filter((branch) => {
        const models = branch.models as ModelsConfig;
        return models.some((model) => model.routing?.only?.includes(params.slug));
      });

      // Batch update all affected branches + delete provider in a single transaction
      await prismaClient.$transaction([
        ...affectedBranches.map((branch) => {
          const models = branch.models as ModelsConfig;
          for (const model of models) {
            const only = model.routing?.only;
            if (!only?.includes(params.slug)) continue;

            const nextOnly = only.filter((slug) => slug !== params.slug);
            model.routing = nextOnly.length > 0 ? { ...model.routing, only: nextOnly } : undefined;
          }
          return prismaClient.branches.update({
            where: { id: branch.id },
            data: { models },
          });
        }),
        prismaClient.provider_configs.update({
          where: { id },
          data: { deleted_at: new Date() },
        }),
      ]);

      return status(204);
    },
    {
      params: z.object({ slug: ProviderSlugSchema }),
      response: { 204: z.void(), 404: z.string() },
    },
  );
