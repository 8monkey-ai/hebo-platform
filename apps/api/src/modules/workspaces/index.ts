import { Elysia, status } from "elysia";
import { z } from "zod";

import { auth } from "@hebo/shared-api/middlewares/auth";
import { slugFromString } from "@hebo/shared-api/utils/slug";

import { prisma } from "~api/middlewares/prisma";

import {
  WorkspaceCreateSchema,
  WorkspaceUpdateSchema,
  WorkspacePlainSchema,
  WorkspaceListSchema,
} from "./types";

export const workspacesModule = new Elysia({
  prefix: "/workspaces",
})
  .use(auth)
  .use(prisma)
  .get(
    "/",
    async ({ prismaClient }) => {
      return status(200, await prismaClient.workspace.findMany());
    },
    {
      response: { 200: WorkspaceListSchema },
    },
  )
  .post(
    "/",
    async ({ body, prismaClient, organizationId, userId, authClient }) => {
      const workspaceSlug = body.slug ?? slugFromString(body.name);

      const { data: team, error: createTeamError } = await authClient!.organization.createTeam({
        name: `${body.name}'s Team`,
        organizationId: organizationId!,
        workspaceSlug,
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
        await prismaClient.workspace.create({
          data: {
            name: body.name,
            slug: workspaceSlug,
            team_id: team.id,
          },
        }),
      );
    },
    {
      body: WorkspaceCreateSchema,
      response: { 201: WorkspacePlainSchema, 409: z.string() },
    },
  )
  .get(
    "/:workspaceSlug",
    async ({ prismaClient, params }) => {
      return status(
        200,
        await prismaClient.workspace.findFirstOrThrow({
          where: { slug: params.workspaceSlug },
        }),
      );
    },
    {
      response: { 200: WorkspacePlainSchema, 404: z.string() },
    },
  )
  .patch(
    "/:workspaceSlug",
    async ({ body, prismaClient, params }) => {
      const { id } = await prismaClient.workspace.findFirstOrThrow({
        where: { slug: params.workspaceSlug },
        select: { id: true },
      });
      return status(
        200,
        await prismaClient.workspace.update({
          where: { id },
          data: { name: body.name },
        }),
      );
    },
    {
      body: WorkspaceUpdateSchema,
      response: { 200: WorkspacePlainSchema, 404: z.string() },
    },
  )
  .delete(
    "/:workspaceSlug",
    async ({ prismaClient, params }) => {
      const { id } = await prismaClient.workspace.findFirstOrThrow({
        where: { slug: params.workspaceSlug },
        select: { id: true },
      });
      await prismaClient.workspace.softDelete({ id });
      return status(204);
    },
    {
      response: { 204: z.void(), 404: z.string() },
    },
  );
