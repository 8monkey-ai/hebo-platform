// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboApi from "./api";
import heboAuth from "./auth";
import { isProduction, normalizedStage, smtpHost } from "./env";
import heboGateway from "./gateway";

const heboConsole = new sst.aws.StaticSite("HeboConsole", {
  path: "apps/console",
  build: {
    command: "bun run build",
    output: "build/client",
  },
  domain: isProduction ? "console.hebo.ai" : `console.${normalizedStage}.hebo.ai`,
  environment: {
    VITE_API_URL: heboApi.url,
    VITE_AUTH_URL: heboAuth.url,
    VITE_GATEWAY_URL: heboGateway.url,
    VITE_MAGICLINK_AUTH: smtpHost.value.apply((v) => (v !== "undefined" ? "true" : "")),
  },
});

export default heboConsole;
