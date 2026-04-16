import { Elysia, status } from "elysia";
import { z } from "zod";

import { auth } from "@hebo/shared-api/middlewares/auth";
import { slugFromString } from "@hebo/shared-api/utils/slug";

import { prisma } from "~api/middlewares/prisma";

import {
  AgentCreateSchema,
  AgentIncludeSchema,
  AgentUpdateSchema,
  AgentPlainSchema,
} from "./types";

export const agentsModule = new Elysia({
  prefix: "/agents",
})
  .use(auth)
  .use(prisma)
  .get(
    "/",
    async ({ prismaClient, query }) => {
      return status(
        200,
        await prismaClient.agents.findMany({
          include: query,
        }),
      );
    },
    {
      query: AgentIncludeSchema,
      response: { 200: z.array(AgentPlainSchema) },
    },
  )
  .post(
    "/",
    async ({ body, prismaClient, organizationId, userId, authClient }) => {
      const agentSlug = slugFromString(body.name, 3);

      const { data: team, error: createTeamError } = await authClient!.organization.createTeam({
        name: `${body.name}'s Team`,
        organizationId: organizationId!,
        agentSlug,
      });
      if (createTeamError || !team) {
        throw new Error(`Failed to create team: ${createTeamError?.message ?? "Unknown error"}`);
      }

      const { error: addTeamMemberError } = await authClient!.organization.addTeamMember({
        teamId: team.id,
        userId: userId,
      });
      if (addTeamMemberError) {
        throw new Error(
          `Failed to add team member: ${addTeamMemberError?.message ?? "Unknown error"}`,
        );
      }

      return status(
        201,
        await prismaClient.agents.create({
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
          },
          include: { branches: true },
        }),
      );
    },
    {
      body: AgentCreateSchema,
      response: { 201: AgentPlainSchema, 409: z.string() },
    },
  )
  .get(
    "/:agentSlug",
    async ({ prismaClient, params, query }) => {
      return status(
        200,
        await prismaClient.agents.findFirstOrThrow({
          where: { slug: params.agentSlug },
          include: query,
        }),
      );
    },
    {
      query: AgentIncludeSchema,
      response: { 200: AgentPlainSchema, 404: z.string() },
    },
  )
  .patch(
    "/:agentSlug",
    async ({ body, prismaClient, params, query }) => {
      return status(
        200,
        await prismaClient.agents.update({
          where: { slug: params.agentSlug },
          data: { name: body.name },
          include: query,
        }),
      );
    },
    {
      query: AgentIncludeSchema,
      body: AgentUpdateSchema,
      response: { 200: AgentPlainSchema, 404: z.string() },
    },
  )
  .delete(
    "/:agentSlug",
    async ({ prismaClient, params }) => {
      await prismaClient.agents.softDelete({ slug: params.agentSlug });
      return status(204);
    },
    {
      response: { 204: z.void(), 404: z.string() },
    },
  );
