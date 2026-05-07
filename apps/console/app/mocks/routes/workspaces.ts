import { http, HttpResponse } from "msw";
import slugify from "slugify";

import { db } from "~console/mocks/db";

export const workspaceHandlers = [
  http.post("/api/v1/workspaces", async ({ request }) => {
    const body = (await request.json()) as { name: string; slug?: string };
    const workspaceSlug = body.slug ?? slugify(body.name, { lower: true, strict: true });

    const existing = db.workspaces.findFirst((q) => q.where({ slug: workspaceSlug }));
    if (existing)
      return new HttpResponse("Workspace with the same slug already exists", { status: 409 });

    const workspace = await db.workspaces.create({
      slug: workspaceSlug,
      name: body.name,
      team_id: `team-${workspaceSlug}`,
      presets: [],
    });

    return HttpResponse.json(workspace, { status: 201 });
  }),

  http.get("/api/v1/workspaces", () => {
    return HttpResponse.json(db.workspaces.findMany());
  }),

  http.get<{ workspaceSlug: string }>(
    "/api/v1/workspaces/:workspaceSlug",
    ({ params }) => {
      const workspace = db.workspaces.findFirst((q) => q.where({ slug: params.workspaceSlug }));
      if (!workspace) return new HttpResponse("Not found", { status: 404 });
      return HttpResponse.json(workspace);
    },
  ),

  http.delete<{ workspaceSlug: string }>(
    "/api/v1/workspaces/:workspaceSlug",
    ({ params }) => {
      db.workspaces.delete((q) => q.where({ slug: params.workspaceSlug }));
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // Presets
  http.get<{ workspaceSlug: string }>(
    "/api/v1/workspaces/:workspaceSlug/presets",
    ({ params }) => {
      const workspace = db.workspaces.findFirst((q) => q.where({ slug: params.workspaceSlug }));
      if (!workspace) return new HttpResponse("Not found", { status: 404 });
      return HttpResponse.json(workspace.presets);
    },
  ),

  http.post<{ workspaceSlug: string }>(
    "/api/v1/workspaces/:workspaceSlug/presets",
    async ({ params, request }) => {
      const body = (await request.json()) as { name: string; slug: string; model: string };
      const workspace = db.workspaces.findFirst((q) => q.where({ slug: params.workspaceSlug }));
      if (!workspace) return new HttpResponse("Not found", { status: 404 });

      if (workspace.presets.some((p) => p.slug === body.slug))
        return new HttpResponse("Preset with the same slug already exists", { status: 409 });

      const preset = await db.presets.create({
        slug: body.slug,
        name: body.name,
        model: body.model,
        workspace_id: workspace.slug,
      });

      await db.workspaces.update(workspace, {
        data(w) {
          w.presets.push(preset);
        },
      });

      return HttpResponse.json(preset, { status: 201 });
    },
  ),

  http.patch<{ workspaceSlug: string; presetSlug: string }>(
    "/api/v1/workspaces/:workspaceSlug/presets/:presetSlug",
    async ({ params, request }) => {
      const body = (await request.json()) as { name?: string; model?: string };
      const preset = db.presets.findFirst((q) =>
        q.where({
          slug: params.presetSlug,
          workspace_id: params.workspaceSlug,
        }),
      );
      if (!preset) return new HttpResponse("Not found", { status: 404 });

      const updated = await db.presets.update(preset, {
        data(p) {
          if (body.name !== undefined) p.name = body.name;
          if (body.model !== undefined) p.model = body.model;
          p.updated_at = new Date();
        },
      });

      return HttpResponse.json(updated);
    },
  ),

  http.delete<{ workspaceSlug: string; presetSlug: string }>(
    "/api/v1/workspaces/:workspaceSlug/presets/:presetSlug",
    ({ params }) => {
      db.presets.delete((q) =>
        q.where({ slug: params.presetSlug, workspace_id: params.workspaceSlug }),
      );
      return new HttpResponse(null, { status: 204 });
    },
  ),
];
