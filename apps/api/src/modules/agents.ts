import { Elysia, status, t } from "elysia";

import { authClient } from "@hebo/shared-api/middlewares/auth/better-auth";
import { getAuthHeaders } from "@hebo/shared-api/utils/auth-headers";
import { slugFromString } from "@hebo/shared-api/utils/create-slug";

import {
  agentsInclude,
  agentsInputCreate,
  agentsInputUpdate,
  agentsPlain,
  agentsRelations,
} from "~api/generated/prismabox/agents";
import { dbClient } from "~api/middleware/db-client";

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
    async (ctx) => {
      const { body, dbClient, request } = ctx;
      const organizationId = (ctx as unknown as { organizationId: string })
        .organizationId;

      const agentSlug = slugFromString(body.name, 3);

      const { data: team, error } = await authClient.organization.createTeam({
        name: `${body.name}'s Team`,
        organizationId,
        agentSlug,
        fetchOptions: { headers: getAuthHeaders(request) },
      });

      if (error || !team) {
        throw new Error(
          `Failed to create team: ${error?.message ?? "Unknown error"}`,
        );
      }

      return status(
        201,
        await dbClient.agents.create({
          data: {
            name: body.name,
            slug: agentSlug,
            team_id: team.id,
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
