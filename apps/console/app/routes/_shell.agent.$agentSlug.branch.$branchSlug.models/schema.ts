import { z } from "zod";

export const modelConfigSchema = z.object({
  alias: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a unique alias name"),
  type: ((msg) => z.string(msg).trim().min(1, msg))("Select one of the supported models"),
  routing: z
    .object({
      only: z.array(z.string().optional())
        .transform((value) => (value[0] === undefined ? [] : value))
    })
    .optional(),
});

export const modelsConfigFormSchema = z.object({
  models: z.array(modelConfigSchema).optional(),
});

export type ModelsConfigFormValues = z.infer<typeof modelsConfigFormSchema>;
export type ModelConfigFormValue = NonNullable<ModelsConfigFormValues["models"]>[number];
