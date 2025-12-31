import heboApi from "./api";
import heboAuth from "./auth";
import { isProd } from "./env";
import heboGateway from "./gateway";

const heboConsole = new sst.aws.StaticSite("HeboConsole", {
  path: "apps/console",
  build: {
    command: "bun run build",
    output: "build/client",
  },
  domain: isProd ? "console.hebo.ai" : `console.${$app.stage}.hebo.ai`,
  environment: {
    VITE_API_URL: heboApi.url,
    VITE_AUTH_URL: heboAuth.url,
    VITE_GATEWAY_URL: heboGateway.url,
  },
});

export default heboConsole;
