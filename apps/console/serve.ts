import { resolve } from "node:path";

const port = Number(process.env.PORT ?? 8520);
const dir = resolve(import.meta.dirname, "build/client");
const indexFile = Bun.file(`${dir}/index.html`);

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;

    if (path !== "/") {
      const file = Bun.file(`${dir}${path}`);
      if (await file.exists()) return new Response(file);

      // Static asset miss (has extension) => 404
      if (path.includes(".")) return new Response("Not Found", { status: 404 });
    }

    // SPA fallback for client-side routes
    return new Response(indexFile);
  },
});
