import { Elysia, status } from "elysia";
import { z } from "zod";

import { prisma } from "~api/middlewares/prisma";

import {
  PresetCreateSchema,
  PresetUpdateSchema,
  PresetPlainSchema,
  PresetListSchema,
} from "./types";

export const presetsModule = new Elysia({
  prefix: "/workspaces/:workspaceSlug/presets",
})
  .use(prisma)
  .get(
    "/",
    async ({ prismaClient, params }) => {
      return status(
        200,
        await prismaClient.presets.findMany({
          where: { workspace: { slug: params.workspaceSlug } },
        }),
      );
    },
    {
      response: { 200: PresetListSchema, 404: z.string() },
    },
  )
  .post(
    "/",
    async ({ body, prismaClient, params }) => {
      const workspace = await prismaClient.workspaces.findFirstOrThrow({
        where: { slug: params.workspaceSlug },
        select: { id: true },
      });
      return status(
        201,
        await prismaClient.presets.create({
          data: {
            workspace_id: workspace.id,
            name: body.name,
            slug: body.slug,
            model: body.model,
          },
        }),
      );
    },
    {
      body: PresetCreateSchema,
      response: { 201: PresetPlainSchema, 404: z.string(), 409: z.string() },
    },
  )
  .get(
    "/:presetSlug",
    async ({ prismaClient, params }) => {
      return status(
        200,
        await prismaClient.presets.findFirstOrThrow({
          where: {
            slug: params.presetSlug,
            workspace: { slug: params.workspaceSlug },
          },
        }),
      );
    },
    {
      response: { 200: PresetPlainSchema, 404: z.string() },
    },
  )
  .patch(
    "/:presetSlug",
    async ({ body, prismaClient, params }) => {
      const { id } = await prismaClient.presets.findFirstOrThrow({
        where: {
          slug: params.presetSlug,
          workspace: { slug: params.workspaceSlug },
        },
        select: { id: true },
      });
      return status(
        200,
        await prismaClient.presets.update({
          where: { id },
          data: { name: body.name, model: body.model },
        }),
      );
    },
    {
      body: PresetUpdateSchema,
      response: { 200: PresetPlainSchema, 404: z.string() },
    },
  )
  .delete(
    "/:presetSlug",
    async ({ prismaClient, params }) => {
      const { id } = await prismaClient.presets.findFirstOrThrow({
        where: {
          slug: params.presetSlug,
          workspace: { slug: params.workspaceSlug },
        },
        select: { id: true },
      });
      await prismaClient.presets.softDelete({ id });
      return status(204);
    },
    {
      response: { 204: z.void(), 404: z.string() },
    },
  );
