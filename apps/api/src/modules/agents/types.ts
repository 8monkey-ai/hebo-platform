import { z } from "zod";

import { BranchPlainSchema } from "~api/modules/branches/types";

import { ModelConfigSchema } from "../providers/types";

export const AgentPlainSchema = z.object({
  slug: z.string(),
  name: z.string().trim().min(1),
  branches: z.array(BranchPlainSchema).optional(),
  team_id: z.string(),
  created_by: z.string(),
  created_at: z.date(),
  updated_by: z.string(),
  updated_at: z.date(),
});

export const AgentCreateSchema = AgentPlainSchema.pick({ name: true }).extend({
  defaultModel: ModelConfigSchema.shape.type,
});

export const AgentUpdateSchema = AgentPlainSchema.pick({ name: true }).partial();

export const AgentIncludeSchema = z.object({
  branches: z.coerce.boolean().optional(),
});

export type AgentPlain = z.infer<typeof AgentPlainSchema>;
export type AgentCreate = z.infer<typeof AgentCreateSchema>;
export type AgentUpdate = z.infer<typeof AgentUpdateSchema>;
