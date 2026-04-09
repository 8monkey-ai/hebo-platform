import { resolve } from "node:path";

const port = Number(process.env.PORT ?? 8520);
const dir = resolve(import.meta.dirname, "build/client");

Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(req) {
    let path = new URL(req.url).pathname;
    if (path === "/") path = "/index.html";

    const file = Bun.file(`${dir}${path}`);
    if (await file.exists()) return new Response(file);

    return new Response(Bun.file(`${dir}/index.html`));
  },
});
