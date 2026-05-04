import { Elysia, status } from "elysia";
import { z } from "zod";

import { prisma } from "~api/middlewares/prisma";

import {
  type Provider,
  ProviderSchema,
  ProvidersSchema,
  ProviderSlugSchema,
  ProviderConfigSchema,
  ProviderConfiguredSchema,
} from "./types";

export const providersModule = new Elysia({
  prefix: "/providers",
})
  .use(prisma)
  .get(
    "/",
    async ({ prismaClient, query }) => {
      const providerConfigs = await prismaClient.provider_configs.findMany();

      let providers = ProviderSchema.options.map(
        (o) =>
          ({
            slug: o.shape.slug.value,
            name: o.shape.name.value,
            config: providerConfigs.find((p) => p.provider_slug === o.shape.slug.value)?.value,
          }) as Provider,
      );

      if (query.configured) {
        providers = providers.filter((p) => p.config !== undefined);
      }

      return status(200, providers);
    },
    {
      query: ProviderConfiguredSchema,
      response: { 200: ProvidersSchema },
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
        },
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

      await prismaClient.provider_configs.softDelete({ id });

      return status(204);
    },
    {
      params: z.object({ slug: ProviderSlugSchema }),
      response: { 204: z.void(), 404: z.string() },
    },
  );
