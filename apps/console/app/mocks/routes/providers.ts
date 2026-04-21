import { http, HttpResponse } from "msw";

import { ProviderSchema } from "~api/modules/providers/types";
import { db } from "~console/mocks/db";

export const providerHandlers = [
  http.get("/api/v1/providers", ({ request }) => {
    const configured = new URL(request.url).searchParams.get("configured");

    const providers = [];

    for (const o of ProviderSchema.options) {
      const slug = o.shape.slug.value;
      const configuredProvider = db.providers.findFirst((q) => q.where({ slug }));

      if (configuredProvider) {
        providers.push(configuredProvider);
      } else if (configured !== "true") {
        providers.push({ slug, name: o.shape.name.value, config: undefined });
      }
    }

    return HttpResponse.json(providers);
  }),

  http.put<{ slug: string }>("/api/v1/providers/:slug/config", async ({ params, request }) => {
    const body = await request.json();
    const o = ProviderSchema.options.find((option) => option.shape.slug.value === params.slug);

    const existing = db.providers.findFirst((q) => q.where({ slug: params.slug }));

    const provider = existing
      ? await db.providers.update(existing, {
          data(p) {
            p.config = body;
          },
        })
      : await db.providers.create({
          slug: params.slug,
          name: o!.shape.name.value,
          config: body,
        });

    return HttpResponse.json(provider, { status: 201 });
  }),

  http.delete<{ slug: string }>("/api/v1/providers/:slug/config", ({ params }) => {
    db.providers.delete((q) => q.where({ slug: params.slug }));

    return new HttpResponse(undefined, { status: 200 });
  }),
];
