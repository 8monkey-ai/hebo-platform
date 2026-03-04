import { http, HttpResponse } from "msw";
import slugify from "slugify";

import { db } from "~console/mocks/db";

export const agentHandlers = [
  http.post("/api/v1/agents", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      defaultModel: string;
    };
    const agentSlug = slugify(body.name, { lower: true, strict: true });

    const existingAgent = db.agents.findFirst((q) => q.where({ slug: agentSlug }));
    if (existingAgent)
      return new HttpResponse("Agent with the same slug already exists", {
        status: 409,
      });

    const agent = await db.agents.create({
      slug: agentSlug,
      name: body.name,
      branches: [
        await db.branches.create({
          agent_slug: agentSlug,
          slug: "main",
          name: "Main",
          models: [
            {
              alias: "default",
              type: body.defaultModel,
            },
          ],
        }),
      ],
    });

    return HttpResponse.json(agent, { status: 201 });
  }),

  http.get("/api/v1/agents", async () => {
    const agents = db.agents.findMany();

    return HttpResponse.json(agents);
  }),

  http.get<{ agentSlug: string }>("/api/v1/agents/:agentSlug", async ({ params, request }) => {
    const url = new URL(request.url);
    const branchesInclude = url.searchParams.get("branches");

    const agent = db.agents.findFirst((q) => q.where({ slug: params.agentSlug }));
    if (!agent)
      return new HttpResponse("Agent with the slug not found", {
        status: 404,
      });

    return branchesInclude === "true"
      ? HttpResponse.json(agent)
      : HttpResponse.json({ ...agent, branches: [] });
  }),

  http.delete<{ agentSlug: string }>("/api/v1/agents/:agentSlug", async ({ params }) => {
    db.agents.delete((q) => q.where({ slug: params.agentSlug }));

    return new HttpResponse(undefined, { status: 200 });
  }),
];
