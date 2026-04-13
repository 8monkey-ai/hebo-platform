import { z } from "zod";

import { aliasPattern } from "~api/modules/providers/types";

export const modelConfigSchema = z.object({
  alias: ((msg) =>
    z
      .string(msg)
      .trim()
      .min(1, msg)
      .regex(
        aliasPattern,
        "Alias must start with a letter or number and contain only letters, numbers, hyphens, and underscores",
      ))("Please enter a unique alias name"),
  type: ((msg) => z.string(msg).trim().min(1, msg))("Select one of the supported models"),
  routing: z
    .object({
      only: z
        .array(z.string().optional())
        .transform((value) => value.filter((v): v is string => v !== undefined)),
    })
    .optional(),
});

export const modelsConfigFormSchema = z.object({
  models: z.array(modelConfigSchema).optional(),
});

export { aliasPattern };

export type ModelsConfigFormValues = z.infer<typeof modelsConfigFormSchema>;
export type ModelConfigFormValue = NonNullable<ModelsConfigFormValues["models"]>[number];
