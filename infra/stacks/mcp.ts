// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import { disableInitProcess, domain } from "./helpers";
import { isProduction, greptimeHost, authSecret } from "./env";

const mcpPort = "8524";

const heboMcp = new sst.aws.Service("HeboMcp", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: "0.25 vCPU",
  memory: "0.5 GB",
  link: [authSecret, greptimeHost],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile",
    tags: [domain("mcp")],
    args: { NODE_ENV: isProduction ? "production" : "development" },
  },
  environment: {
    HEBO_MODE: "mcp",
    PORT: mcpPort,
  },
  loadBalancer: {
    rules: [{ listen: "80/http", forward: `${mcpPort}/http` }],
  },
  transform: {
    taskDefinition: disableInitProcess,
  },
  scaling: {
    min: 1,
    max: 1,
  },
  capacity: "spot",
  wait: isProduction,
});

export default heboMcp;
