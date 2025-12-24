import { Elysia, status, t } from "elysia";

import {
  Provider,
  ProviderConfig,
  ProviderSlug,
  supportedProviders,
} from "@hebo/database/src/types/providers";
import { dbClient } from "@hebo/shared-api/middlewares/db-client";
import { Models } from "@hebo/shared-api/types/model-config";

export const providersModule = new Elysia({
  prefix: "/providers",
})
  .use(dbClient)
  .get(
    "/",
    async ({ dbClient, query }) => {
      const providerConfigs = await dbClient.provider_configs.findMany();

      let providers = Object.entries(supportedProviders).map(
        ([slug, { name }]) =>
          ({
            slug: slug as ProviderSlug,
            name,
            config: providerConfigs.find((p) => p.provider_slug === slug)
              ?.value,
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
    async ({ body, dbClient, params }) => {
      const existing = await dbClient.provider_configs.findFirst({
        where: { provider_slug: params.slug },
        select: { id: true },
      });

      const providerConfig = await dbClient.provider_configs.create({
        data: {
          provider_slug: params.slug,
          value: body,
        } as any,
      });

      if (existing) {
        await dbClient.provider_configs.softDelete({ id: existing.id });
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
    async ({ dbClient, params }) => {
      const { id } = await dbClient.provider_configs.findFirstOrThrow({
        where: { provider_slug: params.slug },
        select: { id: true },
      });

      const branches = await dbClient.branches.findMany();

      const affectedBranches = branches.filter((branch) => {
        const models = branch.models as Models;
        return models.some((model) =>
          model.routing?.only?.includes(params.slug),
        );
      });

      // Batch update all affected branches + delete provider in a single transaction
      await dbClient.$transaction([
        ...affectedBranches.map((branch) => {
          const models = branch.models as Models;
          return dbClient.branches.update({
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
        dbClient.provider_configs.update({
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
