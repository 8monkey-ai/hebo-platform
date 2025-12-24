import { Type, type Static } from "@sinclair/typebox";

import { ProviderSlug } from "@hebo/database/src/types/providers";

export const ModelConfig = Type.Object({
  alias: Type.String({ minLength: 1 }),
  type: Type.String(),
  // Inspired from Vercel Provider Options: https://vercel.com/docs/ai-gateway/provider-options
  routing: Type.Optional(
    Type.Object({
      only: Type.Array(ProviderSlug),
    }),
  ),
});

export type ModelConfig = Static<typeof ModelConfig>;

export const Models = Type.Array(ModelConfig);
export type Models = Static<typeof Models>;
