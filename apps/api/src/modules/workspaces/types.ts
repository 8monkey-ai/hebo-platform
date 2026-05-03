import { z } from "zod";

export const WorkspacePlainSchema = z.object({
  slug: z.string(),
  name: z.string().trim().min(1),
  team_id: z.string(),
  created_by: z.string(),
  created_at: z.date(),
  updated_by: z.string(),
  updated_at: z.date(),
});

export const WorkspaceListSchema = z.array(WorkspacePlainSchema);

export const WorkspaceCreateSchema = WorkspacePlainSchema.pick({ name: true, slug: true }).partial({
  slug: true,
});

export const WorkspaceUpdateSchema = WorkspacePlainSchema.pick({ name: true }).partial();

export type WorkspacePlain = z.infer<typeof WorkspacePlainSchema>;
export type WorkspaceList = z.infer<typeof WorkspaceListSchema>;
export type WorkspaceCreate = z.infer<typeof WorkspaceCreateSchema>;
export type WorkspaceUpdate = z.infer<typeof WorkspaceUpdateSchema>;
