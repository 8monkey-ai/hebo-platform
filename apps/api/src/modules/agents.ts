import { Elysia, status, t } from "elysia";

import { createSlug } from "@hebo/database/src/utils/create-slug";
import { dbClient } from "@hebo/shared-api/middlewares/db-client";

import {
  agentsInclude,
  agentsInputCreate,
  agentsInputUpdate,
  agentsPlain,
  agentsRelations,
} from "~api/generated/prismabox/agents";

export const agents = t.Composite([agentsPlain, t.Partial(agentsRelations)], {
  additionalProperties: false,
});

export const agentsModule = new Elysia({
  prefix: "/agents",
})
  .use(dbClient)
  .get(
    "/",
    async ({ dbClient, query }) => {
      return status(
        200,
        await dbClient.agents.findMany({
          include: query,
        }),
      );
    },
    {
      query: agentsInclude,
      response: { 200: t.Array(agents) },
    },
  )
  .post(
    "/",
    async ({ body, dbClient }) => {
      return status(
        201,
        await dbClient.agents.create({
          data: {
            name: body.name,
            slug: createSlug(body.name, true),
            branches: {
              create: {
                name: "Main",
                slug: "main",
                models: [{ alias: "default", type: body.defaultModel }],
              },
            },
          } as any,
          include: { branches: true },
        }),
      );
    },
    {
      body: t.Object({
        ...agentsInputCreate.properties,
        defaultModel: t.String(),
      }),
      response: { 201: agents, 409: t.String() },
    },
  )
  .get(
    "/:agentSlug",
    async ({ dbClient, params, query }) => {
      return status(
        200,
        await dbClient.agents.findFirstOrThrow({
          where: { slug: params.agentSlug },
          include: query,
        }),
      );
    },
    {
      query: agentsInclude,
      response: { 200: agents, 404: t.String() },
    },
  )
  .patch(
    "/:agentSlug",
    async ({ body, dbClient, params, query }) => {
      return status(
        200,
        await dbClient.agents.update({
          where: { slug: params.agentSlug },
          data: { name: body.name },
          include: query,
        }),
      );
    },
    {
      query: agentsInclude,
      body: agentsInputUpdate,
      response: { 200: agents, 404: t.String() },
    },
  )
  .delete(
    "/:agentSlug",
    async ({ dbClient, params }) => {
      await dbClient.agents.softDelete({ slug: params.agentSlug });
      return status(204);
    },
    {
      response: { 204: t.Void(), 404: t.String() },
    },
  );
