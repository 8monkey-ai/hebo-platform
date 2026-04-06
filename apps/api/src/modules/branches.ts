import { Elysia, status } from "elysia";
import { z } from "zod";

import { slugFromString } from "@hebo/shared-api/utils/slug";

import type { Prisma } from "~api/generated/prisma/client";
import { branchesModelSchema } from "~api/generated/zod/schemas/variants/pure/branches.pure";
import { prisma } from "~api/middlewares/prisma";

import { Models as ModelsSchema } from "./providers/types";

const branches = branchesModelSchema.omit({ id: true, agent: true });

export const branchesModule = new Elysia({
  prefix: "/agents/:agentSlug/branches",
})
  .use(prisma)
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
      response: { 200: z.array(branches), 404: z.string() },
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
          } as unknown as Prisma.branchesCreateInput,
        }),
      );
    },
    {
      body: z.object({
        name: z.string(),
        sourceBranchSlug: z.string(),
      }),
      response: { 201: branches, 404: z.string(), 409: z.string() },
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
      response: { 200: branches, 404: z.string() },
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
      body: z.object({
        name: z.string().optional(),
        models: ModelsSchema.optional(),
      }),
      response: { 200: branches, 404: z.string() },
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
      response: { 204: z.void(), 404: z.string(), 409: z.string() },
    },
  );
