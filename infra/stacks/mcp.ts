// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import { isProduction, greptimeHost, authSecret } from "./env";
import { disableInitProcess, hostname } from "./helpers";

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
    tags: [hostname("mcp")],
    args: { NODE_ENV: isProduction ? "production" : "development" },
  },
  environment: {
    HEBO_MODE: "mcp",
    PORT: mcpPort,
  },
  loadBalancer: {
    domain: hostname("mcp-origin"),
    rules: [
      { listen: "80/http", forward: `${mcpPort}/http` },
      { listen: "443/https", forward: `${mcpPort}/http` },
    ],
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

const mcpRouter = new sst.aws.Router("HeboMcpRouter", {
  routes: { "/*": heboMcp.url },
  domain: hostname("mcp"),
});

export default heboMcp;
