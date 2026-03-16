import { z } from "zod";

export const aliasPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export const modelConfigSchema = z.object({
  alias: ((msg) =>
    z
      .string(msg)
      .trim()
      .min(1, msg)
      .regex(aliasPattern, "Alias must start with a letter or number and contain only letters, numbers, hyphens, and underscores")
  )("Please enter a unique alias name"),
  type: ((msg) => z.string(msg).trim().min(1, msg))("Select one of the supported models"),
  routing: z
    .object({
      only: z
        .array(z.string().optional())
        .transform((value) => (value[0] === undefined ? [] : value)),
    })
    .optional(),
});

export const modelsConfigFormSchema = z.object({
  models: z.array(modelConfigSchema).optional(),
});

export type ModelsConfigFormValues = z.infer<typeof modelsConfigFormSchema>;
export type ModelConfigFormValue = NonNullable<ModelsConfigFormValues["models"]>[number];
