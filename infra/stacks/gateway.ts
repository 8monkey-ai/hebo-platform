import heboAuth from "./auth";
import heboCluster from "./cluster";
import heboDatabase from "./db";
import { llmSecrets, otelSecrets, isProd, normalizedStage } from "./env";

const gatewayDomain = isProd
  ? "gateway.hebo.ai"
  : `gateway.${normalizedStage}.hebo.ai`;
const gatewayPort = "3002";

const heboGateway = new sst.aws.Service("HeboGateway", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProd ? "1 vCPU" : "0.25 vCPU",
  memory: isProd ? "2 GB" : "0.5 GB",
  permissions: [
    {
      actions: ["sts:AssumeRole"],
      resources: ["*"],
    },
  ],
  link: [heboDatabase, ...llmSecrets, ...otelSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.gateway",
    tags: [gatewayDomain],
  },
  environment: {
    IS_REMOTE: $dev ? "false" : "true",
    AUTH_URL: heboAuth.url,
    LOG_LEVEL: isProd ? "info" : "debug",
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: gatewayPort,
  },
  loadBalancer: {
    domain: gatewayDomain,
    rules: [
      { listen: "80/http", redirect: "443/https" },
      { listen: "443/https", forward: `${gatewayPort}/http` },
    ],
  },
  scaling: {
    min: isProd ? 2 : 1,
    max: isProd ? 4 : 1,
  },
  capacity: isProd ? undefined : "spot",
  wait: isProd,
});

export default heboGateway;
