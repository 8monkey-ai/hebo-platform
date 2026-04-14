import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import rehypeShiki from "@shikijs/rehype";
import tailwindcss from "@tailwindcss/vite";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

export default defineConfig(({ command }) => {
  return {
    resolve: {
      tsconfigPaths: true,
      // FUTURE: Remove once react-dom ships renderToPipeableStream in server.bun.js
      // (fixed in canary, pending stable 19.3.0).
      // https://github.com/remix-run/react-router/issues/12568
      // https://github.com/facebook/react/pull/34193
      //
      // In a pure-Bun environment (e.g. oven/bun Docker image), react-dom/server
      // resolves to server.bun.js which doesn't export renderToPipeableStream —
      // breaking rolldown's link step during React Router's server bundle build.
      ...(command === "build" && {
        alias: { "react-dom/server": "react-dom/server.node" },
      }),
    },
    server: { port: 8520, devtoolsJsonFile: true },
    optimizeDeps: {
      entries: ["app/root.tsx", "app/routes/**/route.{ts,tsx,mdx}"],
      include: ["react/compiler-runtime"],
    },
    plugins: [
      preserveDirectives(),
      mdx({
        providerImportSource: "~console/mdx-components",
        rehypePlugins: [
          [
            rehypeShiki,
            {
              theme: "vitesse-light",
              langs: ["bash", "python", "ts"],
              // Add code block metadata as HTML attributes
              addLanguageClass: true,
              parseMetaString: (meta: string): Record<string, string> =>
                meta ? { title: meta.trim() } : {},
            },
          ],
        ],
      }),
      tailwindcss(),
      reactRouter(),
      babel({
        filter: (id) => /\.[jt]sx?$/.test(id) && !id.includes("node_modules"),
        babelConfig: {
          presets: ["@babel/preset-typescript"],
          plugins: [["babel-plugin-react-compiler"]],
        },
      }),
    ],
  };
});
