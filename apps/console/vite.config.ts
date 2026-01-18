import mdx from "@mdx-js/rollup";
import { reactRouter } from "@react-router/dev/vite";
import rehypeShiki from "@shikijs/rehype";
import tailwindcss from "@tailwindcss/vite";
import preserveDirectives from "rollup-preserve-directives";
import { defineConfig, loadEnv } from "vite";
import babel from "vite-plugin-babel";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

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
    // Expose TURBO_HASH to enable local vs CI/build environment detection
    define: {
      "process.env.TURBO_HASH": JSON.stringify(
        process.env.TURBO_HASH ?? env.TURBO_HASH ?? "",
      ),
    },
    // Dummies to emulate network errors during development if MSW is stopped
    ...(mode === "development" &&
      !env.VITE_API_URL && {
        server: {
          proxy: {
            "/api": {
              target: "https://httpbin.org/status/500",
              changeOrigin: true,
              rewrite: () => "",
            },
            "/gateway": {
              target: "https://httpbin.org/status/500",
              changeOrigin: true,
              rewrite: () => "",
            },
          },
        },
      }),
  };
});
