import { z } from "zod";

import { ModelConfig, aliasPattern } from "~api/modules/providers/types";

export const modelsConfigFormSchema = z.object({
  models: z.array(ModelConfig).optional(),
});

export { aliasPattern };

export type ModelsConfigFormValues = z.infer<typeof modelsConfigFormSchema>;
export type ModelConfigFormValue = NonNullable<ModelsConfigFormValues["models"]>[number];
