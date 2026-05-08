import { z } from "zod";

export const PresetPlainSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  slug: z.string(),
  name: z.string().trim().min(1),
  model: z.string().min(1),
  created_by: z.string(),
  created_at: z.date(),
  updated_by: z.string(),
  updated_at: z.date(),
});

export const PresetListSchema = z.array(PresetPlainSchema);

export const PresetCreateSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  model: z.string().min(1),
});

export const PresetUpdateSchema = PresetCreateSchema.pick({
  name: true,
  model: true,
}).partial();

export type PresetPlain = z.infer<typeof PresetPlainSchema>;
export type PresetList = z.infer<typeof PresetListSchema>;
export type PresetCreate = z.infer<typeof PresetCreateSchema>;
export type PresetUpdate = z.infer<typeof PresetUpdateSchema>;
