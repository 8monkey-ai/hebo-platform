// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import { apiRouter } from "./api";
import { authRouter } from "./auth";
import { smtpHost } from "./env";
import { gatewayRouter } from "./gateway";
import { hostname } from "./helpers";

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
