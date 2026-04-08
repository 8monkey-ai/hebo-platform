import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import rehypeShiki from "@shikijs/rehype";
import tailwindcss from "@tailwindcss/vite";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";

export default defineConfig(() => {
  return {
    // React Router's build always emits a server bundle (even with ssr:false).
    // Force Node entry so react-dom/server resolves to server.node.js
    // instead of server.bun.js which lacks renderToPipeableStream.
    // See: https://github.com/remix-run/react-router/issues/12568
    resolve: {
      tsconfigPaths: true,
      alias: { "react-dom/server": "react-dom/server.node" },
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
