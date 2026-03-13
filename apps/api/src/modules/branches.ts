import { Elysia, status, t } from "elysia";

import { slugFromString } from "@hebo/shared-api/utils/create-slug";

import {
  branches,
  branchesInputCreate,
  branchesInputUpdate,
} from "~api/generated/prismabox/branches";
import { prismaClient } from "~api/middleware/prisma";

import { Models } from "./providers/types";

export const branchesModule = new Elysia({
  prefix: "/:agentSlug/branches",
})
  .use(prismaClient)
  .get(
    "/",
    async ({ prismaClient, params }) => {
      return status(
        200,
        await prismaClient.branches.findMany({
          where: { agent_slug: params.agentSlug },
        }),
      );
    },
    {
      response: { 200: t.Array(branches), 404: t.String() },
    },
  )
  .post(
    "/",
    async ({ body, prismaClient, params }) => {
      const { models } = await prismaClient.branches.findFirstOrThrow({
        where: { agent_slug: params.agentSlug, slug: body.sourceBranchSlug },
      });
      return status(
        201,
        await prismaClient.branches.create({
          data: {
            agent_slug: params.agentSlug,
            name: body.name,
            slug: slugFromString(body.name),
            models,
          } as any,
        }),
      );
    },
    {
      body: t.Object({
        name: branchesInputCreate.properties.name,
        sourceBranchSlug: t.String(),
      }),
      response: { 201: branches, 404: t.String(), 409: t.String() },
    },
  )
  .get(
    "/:branchSlug",
    async ({ prismaClient, params }) => {
      return status(
        200,
        await prismaClient.branches.findFirstOrThrow({
          where: { agent_slug: params.agentSlug, slug: params.branchSlug },
        }),
      );
    },
    {
      response: { 200: branches, 404: t.String() },
    },
  )
  .patch(
    "/:branchSlug",
    async ({ body, prismaClient, params }) => {
      const { id } = await prismaClient.branches.findFirstOrThrow({
        where: { agent_slug: params.agentSlug, slug: params.branchSlug },
      });
      return status(
        200,
        await prismaClient.branches.update({
          where: { id },
          data: { name: body.name, models: body.models },
        }),
      );
    },
    {
      body: t.Object({
        name: branchesInputUpdate.properties.name,
        models: t.Optional(Models),
      }),
      response: { 200: branches, 404: t.String() },
    },
  )
  .delete(
    "/:branchSlug",
    async ({ prismaClient, params }) => {
      const [totalBranches, { id }] = await prismaClient.$transaction([
        prismaClient.branches.count({
          where: { agent_slug: params.agentSlug },
        }),
        prismaClient.branches.findFirstOrThrow({
          where: {
            agent_slug: params.agentSlug,
            slug: params.branchSlug,
          },
          select: { id: true },
        }),
      ]);

      if (totalBranches <= 1) {
        return status(
          409,
          "Each agent must keep at least one branch. Create a new branch before deleting this one.",
        );
      }

      await prismaClient.branches.softDelete({ id });
      return status(204);
    },
    {
      response: { 204: t.Void(), 404: t.String(), 409: t.String() },
    },
  );
