// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboApi from "./api";
import heboAuth from "./auth";
import heboGateway from "./gateway";
import { albUrl, hostname } from "./helpers";
import heboMcp from "./mcp";

export const authRouter = new sst.aws.Router("HeboAuthRouter", {
  domain: hostname("auth"),
});
authRouter.route("/", albUrl(heboAuth));

export const apiRouter = new sst.aws.Router("HeboApiRouter", {
  domain: hostname("api"),
});
apiRouter.route("/", albUrl(heboApi));

export const gatewayRouter = new sst.aws.Router("HeboGatewayRouter", {
  domain: hostname("gateway"),
});
gatewayRouter.route("/", albUrl(heboGateway), { readTimeout: "60 seconds" });

export const mcpRouter = new sst.aws.Router("HeboMcpRouter", {
  domain: hostname("mcp"),
});
mcpRouter.route("/", albUrl(heboMcp));
