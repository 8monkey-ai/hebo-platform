import { z } from "zod";

import { aliasPattern, ModelConfig } from "~api/modules/providers/types";

export const modelConfigSchema = ModelConfig.extend({
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
