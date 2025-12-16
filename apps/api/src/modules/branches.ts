import { Elysia, status, t } from "elysia";

import { createSlug } from "@hebo/database/src/utils/create-slug";
import { dbClient } from "@hebo/shared-api/middlewares/db-client";
import { type Models } from "@hebo/shared-api/types/model-config";

import {
  branches,
  branchesInputCreate,
  branchesInputUpdate,
} from "~api/generated/prismabox/branches";

export const branchesModule = new Elysia({
  prefix: "/:agentSlug/branches",
})
  .use(dbClient)
  .get(
    "/",
    async ({ dbClient, params }) => {
      return status(
        200,
        await dbClient.branches.findMany({
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
    async ({ body, dbClient, params }) => {
      const { models } = await dbClient.branches.findFirstOrThrow({
        where: { agent_slug: params.agentSlug, slug: body.sourceBranchSlug },
      });
      return status(
        201,
        await dbClient.branches.create({
          data: {
            agent_slug: params.agentSlug,
            name: body.name,
            slug: createSlug(body.name),
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
    async ({ dbClient, params }) => {
      return status(
        200,
        await dbClient.branches.findFirstOrThrow({
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
    async ({ body, dbClient, params }) => {
      const { id } = await dbClient.branches.findFirstOrThrow({
        where: { agent_slug: params.agentSlug, slug: params.branchSlug },
      });
      return status(
        200,
        await dbClient.branches.update({
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
    async ({ dbClient, params }) => {
      const [totalBranches, { id }] = await dbClient.$transaction([
        dbClient.branches.count({
          where: { agent_slug: params.agentSlug },
        }),
        dbClient.branches.findFirstOrThrow({
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

      await dbClient.branches.softDelete({ id });
      return status(204);
    },
    {
      response: { 204: t.Void(), 404: t.String(), 409: t.String() },
    },
  );
