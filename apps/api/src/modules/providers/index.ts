import { Elysia, status, t } from "elysia";

import { prismaClient } from "~api/middleware/prisma";

import { type Models } from "./types";
import { Provider, ProviderConfig, ProviderSlug, supportedProviders } from "./types";

export const providersModule = new Elysia({
  prefix: "/providers",
})
  .use(prismaClient)
  .get(
    "/",
    async ({ prismaClient, query }) => {
      const providerConfigs = await prismaClient.provider_configs.findMany();

      let providers = Object.entries(supportedProviders).map(
        ([slug, { name }]) =>
          ({
            slug: slug as ProviderSlug,
            name,
            config: providerConfigs.find((p) => p.provider_slug === slug)?.value,
          }) as Provider,
      );

      if (query.configured) {
        providers = providers.filter((p) => p.config !== undefined);
      }

      return status(200, providers);
    },
    {
      query: t.Object({
        configured: t.Optional(t.Boolean({ default: false })),
      }),
      response: { 200: t.Array(Provider) },
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
        } as any,
      });

      if (existing) {
        await prismaClient.provider_configs.softDelete({ id: existing.id });
      }

      return status(201, providerConfig.value);
    },
    {
      body: ProviderConfig,
      params: t.Object({ slug: ProviderSlug }),
      response: { 201: ProviderConfig },
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
        const models = branch.models as Models;
        return models.some((model) => model.routing?.only?.includes(params.slug));
      });

      // Batch update all affected branches + delete provider in a single transaction
      await prismaClient.$transaction([
        ...affectedBranches.map((branch) => {
          const models = branch.models as Models;
          return prismaClient.branches.update({
            where: { id: branch.id },
            data: {
              models: models.map((model) =>
                model.routing?.only?.includes(params.slug)
                  ? { ...model, routing: undefined }
                  : model,
              ),
            },
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
      params: t.Object({ slug: ProviderSlug }),
      response: { 204: t.Void(), 404: t.String() },
    },
  );
