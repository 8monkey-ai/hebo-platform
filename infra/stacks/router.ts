// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboApi from "./api";
import heboAuth from "./auth";
import { albUrl, domain } from "./helpers";
import heboGateway from "./gateway";
import heboMcp from "./mcp";

export const authRouter = new sst.aws.Router("HeboAuthRouter", { domain: domain("auth") });
authRouter.route("/*", albUrl(heboAuth));

export const apiRouter = new sst.aws.Router("HeboApiRouter", { domain: domain("api") });
apiRouter.route("/*", albUrl(heboApi));

export const gatewayRouter = new sst.aws.Router("HeboGatewayRouter", { domain: domain("gateway") });
gatewayRouter.route("/*", albUrl(heboGateway), { readTimeout: "60 seconds" });

export const mcpRouter = new sst.aws.Router("HeboMcpRouter", { domain: domain("mcp") });
mcpRouter.route("/*", albUrl(heboMcp));
