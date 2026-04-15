// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboApi from "./api";
import heboAuth from "./auth";
import heboGateway from "./gateway";
import { albUrl, domain } from "./helpers";
import heboMcp from "./mcp";

// FUTURE: remove once https://github.com/sst/sst/issues/6742 is fixed upstream.
// SST's CloudFront Function leaves originAccessControlConfig: { enabled: false }
// on HTTP origins, which prevents customOriginConfig inheritance from the
// placeholder origin and causes CloudFront to default to HTTPS:443 → 502.
const httpOriginFix = {
  edge: {
    viewerRequest: {
      injection: [
        `const _upd = cf.updateRequestOrigin.bind(cf);`,
        `cf.updateRequestOrigin = (o) => {`,
        `  if (o.originAccessControlConfig && !o.originAccessControlConfig.enabled) delete o.originAccessControlConfig;`,
        `  _upd(o);`,
        `};`,
      ].join("\n"),
    },
  },
} as const;

export const authRouter = new sst.aws.Router("HeboAuthRouter", {
  domain: domain("auth"),
  ...httpOriginFix,
});
authRouter.route("/*", albUrl(heboAuth));

export const apiRouter = new sst.aws.Router("HeboApiRouter", {
  domain: domain("api"),
  ...httpOriginFix,
});
apiRouter.route("/*", albUrl(heboApi));

export const gatewayRouter = new sst.aws.Router("HeboGatewayRouter", {
  domain: domain("gateway"),
  ...httpOriginFix,
});
gatewayRouter.route("/*", albUrl(heboGateway), { readTimeout: "60 seconds" });

export const mcpRouter = new sst.aws.Router("HeboMcpRouter", {
  domain: domain("mcp"),
  ...httpOriginFix,
});
mcpRouter.route("/*", albUrl(heboMcp));
