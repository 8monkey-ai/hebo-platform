import { z } from "zod";

import { PresetCreateSchema, PresetUpdateSchema } from "~api/modules/workspaces/presets/types";

export const presetCreateFormSchema = PresetCreateSchema;

export const presetUpdateFormSchema = PresetUpdateSchema.extend({
  slug: z.string().min(1),
});

export type PresetCreateFormValues = z.infer<typeof presetCreateFormSchema>;
export type PresetUpdateFormValues = z.infer<typeof presetUpdateFormSchema>;
