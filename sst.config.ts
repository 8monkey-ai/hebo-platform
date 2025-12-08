// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hebo",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      region: "us-east-1",
      providers: { docker: "4.8.2" },
    };
  },
  async run() {
    await import("./infra/stacks/console");
    await import("./infra/stacks/mcp");
  },
});