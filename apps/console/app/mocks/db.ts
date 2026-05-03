import { Collection } from "@msw/data";
import { z } from "zod";

const workspaceSchema = z.object({
  // Core fields
  slug: z.string(),
  name: z.string(),
  team_id: z.string().default("team-dummy"),

  // Relations
  get presets() {
    return z.array(presetSchema);
  },

  // Audit fields
  created_by: z.string().default("Dummy User"),
  created_at: z.date().default(() => new Date()),
  updated_by: z.string().default("Dummy User"),
  updated_at: z.date().default(() => new Date()),
});

const presetSchema = z.object({
  // Core fields
  id: z.string().default(() => crypto.randomUUID()),
  slug: z.string(),
  name: z.string(),
  model: z.string(),

  // Relations
  workspace_id: z.string(),

  // Audit fields
  created_by: z.string().default("Dummy User"),
  created_at: z.date().default(() => new Date()),
  updated_by: z.string().default("Dummy User"),
  updated_at: z.date().default(() => new Date()),
});

const providerSchema = z.object({
  slug: z.string(),
  name: z.string(),
  config: z.optional(z.unknown()),

  // Audit fields
  created_by: z.string().default("Dummy User"),
  created_at: z.date().default(() => new Date()),
  updated_by: z.string().default("Dummy User"),
  updated_at: z.date().default(() => new Date()),
});

export const createDb = () => {
  const workspaces = new Collection({ schema: workspaceSchema });
  const presets = new Collection({ schema: presetSchema });
  const providers = new Collection({ schema: providerSchema });

  workspaces.defineRelations(({ many }) => ({
    presets: many(presets, { onDelete: "cascade" }),
  }));

  return {
    workspaces,
    presets,
    providers,
  } as const;
};

type DB = ReturnType<typeof createDb>;

declare global {
  var __heboDb: DB | undefined;
}

export const db: DB = (globalThis.__heboDb ??= createDb());
