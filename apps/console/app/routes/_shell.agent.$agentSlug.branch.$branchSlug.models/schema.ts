import { z } from "zod";

import { ModelConfigSchema } from "~api/modules/providers/types";

export const modelsConfigFormSchema = z.object({
  models: z.array(ModelConfigSchema).optional(),
});

export type ModelsConfigFormValues = z.infer<typeof modelsConfigFormSchema>;
