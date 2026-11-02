import { resolve } from "node:path";

/**
 * Inlines runtime console settings before the deferred module bundle runs. Standalone mode
 * derives the magic-link setting from SMTP_HOST to match the distributed deployment.
 */
export const injectRuntimeEnv = (html: string, env: Record<string, string | undefined>) => {
  const values = Object.fromEntries(
    Object.entries(env).filter(([key, value]) => key.startsWith("VITE_") && value),
  );
  if (env.SMTP_HOST && !env.VITE_MAGICLINK_AUTH) values.VITE_MAGICLINK_AUTH = "true";
  return html.replace("<head>", `<head><script>window.heboEnv=${JSON.stringify(values)}</script>`);
};

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8520);
  const dir = resolve(import.meta.dirname, "build/client");
  const indexHtml = injectRuntimeEnv(await Bun.file(`${dir}/index.html`).text(), process.env);

  Bun.serve({
    port,
    async fetch(req) {
      const path = new URL(req.url).pathname;

      // /index.html must fall through, or it serves the build artifact without the config.
      if (path !== "/" && path !== "/index.html") {
        const file = Bun.file(`${dir}${path}`);
        if (await file.exists()) return new Response(file);

        // Static asset miss (has extension) => 404
        if (path.includes(".")) return new Response("Not Found", { status: 404 });
      }

      // SPA fallback for client-side routes. Revalidate always — the document
      // carries the runtime config, so a stale copy points at the wrong domain.
      return new Response(indexHtml, {
        headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-cache" },
      });
    },
  });
}
