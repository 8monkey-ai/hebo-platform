// oxlint-disable-next-line triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hebo",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      region: "us-east-2",
      providers: { aws: "7.20.0", docker: "4.8.2" },
    };
  },
  async run() {
    // FUTURE: remove once https://github.com/sst/sst/issues/6742 is fixed upstream.
    // SST's setUrlOrigin deletes customOriginConfig for HTTP origins but leaves
    // originAccessControlConfig, causing CloudFront to default to HTTPS:443 → 502.
    $transform(aws.cloudfront.Function, (args) => {
      const pattern = /override\.protocol==="http"&&delete origin\.customOriginConfig/g;
      const patch =
        'override.protocol==="http"&&(origin.customOriginConfig={port:80,protocol:"http",sslProtocols:["TLSv1.2"]},delete origin.originAccessControlConfig)';
      args.code = $util.output(args.code).apply((code) =>
        pattern.test(code) ? code.replace(pattern, patch) : code,
      );
    });

    await import("./infra/stacks/db");
    await import("./infra/stacks/greptime");
    await import("./infra/stacks/auth");
    await import("./infra/stacks/api");
    await import("./infra/stacks/gateway");
    await import("./infra/stacks/mcp");
    await import("./infra/stacks/router");
    await import("./infra/stacks/console");
  },
});
