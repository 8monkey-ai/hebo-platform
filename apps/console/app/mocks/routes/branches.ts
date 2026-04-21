import { http, HttpResponse } from "msw";
import slugify from "slugify";

import { db } from "~console/mocks/db";

export const branchHandlers = [
  http.post<{ agentSlug: string }>(
    "/api/v1/agents/:agentSlug/branches",
    async ({ request, params }) => {
      const body = (await request.json()) as {
        name: string;
        source_branch_slug: string;
      };
      const branchSlug = slugify(body.name, { lower: true, strict: true });

      const agent = db.agents.findFirst((q) => q.where({ slug: params.agentSlug }));

      const sourceBranch = agent!.branches.find((b) => b.slug === body.source_branch_slug);

      const existingBranch = agent!.branches.find((b) => b.slug === branchSlug);
      if (existingBranch)
        return new HttpResponse("Branch with the same slug already exists", {
          status: 409,
        });

      const newBranch = await db.branches.create({
        agent_slug: params.agentSlug,
        slug: branchSlug,
        name: body.name,
        models: structuredClone(sourceBranch!.models),
      });

      await db.agents.update(agent!, {
        data(a) {
          a.branches.push(newBranch);
        },
      });

      return HttpResponse.json(newBranch, { status: 201 });
    },
  ),

  http.get<{ agentSlug: string }>("/api/v1/agents/:agentSlug/branches", ({ params }) => {
    const agent = db.agents.findFirst((q) => q.where({ slug: params.agentSlug }));
    if (!agent)
      return new HttpResponse("Agent with the slug not found", {
        status: 404,
      });

    return HttpResponse.json(agent.branches);
  }),

  http.patch<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug",
    async ({ params, request }) => {
      const body = (await request.json()) as { models: [] };

      const branch = db.branches.findFirst((q) =>
        q.where({
          slug: params.branchSlug,
          agent_slug: params.agentSlug,
        }),
      );

      const updatedBranch = await db.branches.update(branch!, {
        data(b) {
          b.models = body.models;
          b.updated_at = new Date();
        },
      });

      return HttpResponse.json(updatedBranch);
    },
  ),

  http.delete<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug",
    ({ params }) => {
      const branches = db.branches.findMany((q) =>
        q.where({
          agent_slug: params.agentSlug,
        }),
      );
      if (branches.length === 1)
        return new HttpResponse("Can't delete last branch of an agent", {
          status: 409,
        });

      db.branches.delete((q) =>
        q.where({
          slug: params.branchSlug,
          agent_slug: params.agentSlug,
        }),
      );

      return new HttpResponse(undefined, { status: 200 });
    },
  ),
];
