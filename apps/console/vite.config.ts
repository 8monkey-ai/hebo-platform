import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import rehypeShiki from "@shikijs/rehype";
import tailwindcss from "@tailwindcss/vite";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      tsconfigPaths(),
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
      ...(mode === "development" ? [devtoolsJson()] : []),
    ],
    // Expose TURBO_HASH to browser enable to detect local dev run
    define: {
      "import.meta.env.TURBO_HASH": JSON.stringify(process.env.TURBO_HASH),
    },
  };
});
