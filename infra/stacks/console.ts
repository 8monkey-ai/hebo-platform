// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import { smtpHost } from "./env";
import { hostname } from "./helpers";
import { apiRouter, authRouter, gatewayRouter } from "./router";

const heboConsole = new sst.aws.StaticSite("HeboConsole", {
  path: "apps/console",
  build: {
    command: "bun run build",
    output: "build/client",
  },
  domain: hostname("console"),
  environment: {
    VITE_API_URL: apiRouter.url,
    VITE_AUTH_URL: authRouter.url,
    VITE_GATEWAY_URL: gatewayRouter.url,
    VITE_MAGICLINK_AUTH: smtpHost.value.apply((v) => (v !== "undefined" ? "true" : "")),
  },
});

export default heboConsole;
