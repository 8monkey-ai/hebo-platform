import heboCluster from "./cluster";
import { otelSecrets, isProduction, normalizedStage } from "./env";

const mcpDomain = isProduction
  ? "mcp.hebo.ai"
  : `mcp.${normalizedStage}.hebo.ai`;
const mcpPort = "3003";

const heboMcp = new sst.aws.Service("HeboMcp", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: "0.25 vCPU",
  memory: "0.5 GB",
  link: [...otelSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.mcp",
    tags: [mcpDomain],
  },
  environment: {
    NODE_ENV: isProduction ? "production" : "development",
    LOG_LEVEL: isProduction ? "info" : "debug",
    PORT: mcpPort,
  },
  loadBalancer: {
    domain: mcpDomain,
    rules: [
      { listen: "80/http", redirect: "443/https" },
      { listen: "443/https", forward: `${mcpPort}/http` },
    ],
  },
  scaling: {
    min: 1,
    max: 1,
  },
  capacity: "spot",
  wait: isProduction,
});

export default heboMcp;
