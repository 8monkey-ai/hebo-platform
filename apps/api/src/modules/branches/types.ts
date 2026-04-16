import { z } from "zod";

import { ModelsConfigSchema } from "~api/modules/providers/types";

export const BranchPlainSchema = z.object({
  slug: z.string(),
  agent_slug: z.string(),
  name: z.string().trim().min(1),
  models: ModelsConfigSchema,
  created_by: z.string(),
  created_at: z.date(),
  updated_by: z.string(),
  updated_at: z.date(),
});

export const BranchCreateSchema = BranchPlainSchema.pick({ name: true }).extend({
  source_branch_slug: z.string().trim().min(1),
});

export const BranchUpdateSchema = BranchPlainSchema.pick({
  name: true,
  models: true,
}).partial();

export type BranchPlain = z.infer<typeof BranchPlainSchema>;
export type BranchCreate = z.infer<typeof BranchCreateSchema>;
export type BranchUpdate = z.infer<typeof BranchUpdateSchema>;
