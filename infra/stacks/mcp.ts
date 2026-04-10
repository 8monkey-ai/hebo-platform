// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import { isProduction, greptimeHost, authSecret, normalizedStage } from "./env";
import { heboImage, disableInitProcess } from "./image";

const mcpDomain = isProduction ? "mcp.hebo.ai" : `mcp.${normalizedStage}.hebo.ai`;
const mcpPort = "8524";

const heboMcp = new sst.aws.Service("HeboMcp", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: "0.25 vCPU",
  memory: "0.5 GB",
  link: [authSecret, greptimeHost],
  image: heboImage,
  environment: {
    HEBO_MODE: "mcp",
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
    taskDefinition: disableInitProcess,
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
