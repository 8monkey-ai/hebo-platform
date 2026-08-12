import { resolve } from "node:path";

// Public config the console resolves at runtime rather than at build time, so one
// prebuilt image can be pointed at any domain. Consumed by app/lib/env.ts.
const RUNTIME_ENV_KEYS = [
  "VITE_API_URL",
  "VITE_AUTH_URL",
  "VITE_GATEWAY_URL",
  "VITE_MAGICLINK_AUTH",
] as const;

/**
 * Inlines `window.heboEnv` at the top of `<head>`. A classic inline script
 * runs before the deferred module bundle, so the app sees the config on first read.
 */
export const injectRuntimeEnv = (html: string, env: Record<string, string | undefined>) => {
  if (!html.includes("<head>")) {
    throw new Error("serve.ts: no <head> in index.html — cannot inject runtime config");
  }

  const values = Object.fromEntries(
    RUNTIME_ENV_KEYS.filter((key) => env[key]).map((key) => [key, env[key]]),
  );
  // Escape `<` so a stray "</script>" in a value can't close the tag early.
  const json = JSON.stringify(values).replaceAll("<", "\\u003c");

  return html.replace("<head>", `<head><script>window.heboEnv=${json}</script>`);
};

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 8520);
  const dir = resolve(import.meta.dirname, "build/client");
  const indexHtml = injectRuntimeEnv(await Bun.file(`${dir}/index.html`).text(), process.env);

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

      // SPA fallback for client-side routes. Revalidate always — the document
      // carries the runtime config, so a stale copy points at the wrong domain.
      return new Response(indexHtml, {
        headers: { "content-type": "text/html;charset=utf-8", "cache-control": "no-cache" },
      });
    },
  });
}
