// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import { heboImage, isProduction, greptimeHost, authSecret, normalizedStage } from "./env";

const mcpDomain = isProduction ? "mcp.hebo.ai" : `mcp.${normalizedStage}.hebo.ai`;
const mcpPort = "8524";

const heboMcp = new sst.aws.Service("HeboMcp", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: "0.25 vCPU",
  memory: "0.5 GB",
  link: [authSecret, greptimeHost],
  image: heboImage ?? {
    context: ".",
    dockerfile: "infra/docker/Dockerfile",
    tags: [mcpDomain],
  },
  environment: {
    HEBO_MODE: "mcp",
    NODE_ENV: isProduction ? "production" : "development",
    PORT: mcpPort,
  },
  loadBalancer: {
    domain: mcpDomain,
    rules: [
      { listen: "80/http", redirect: "443/https" },
      { listen: "443/https", forward: `${mcpPort}/http` },
    ],
  },
  transform: {
    listener: (args) => {
      if (args.protocol === "HTTPS") {
        args.sslPolicy = "ELBSecurityPolicy-TLS13-1-2-2021-06";
      }
    },
  },
  scaling: {
    min: 1,
    max: 1,
  },
  capacity: "spot",
  wait: isProduction,
});

export default heboMcp;
