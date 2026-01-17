import heboAuth from "./auth";
import heboCluster from "./cluster";
import heboDatabase, { createMigrator } from "./db";
import { otelSecrets, isProd, normalizedStage } from "./env";

const apiDomain = isProd ? "api.hebo.ai" : `api.${normalizedStage}.hebo.ai`;
const apiPort = "3001";

const heboApi = new sst.aws.Service("HeboApi", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProd ? "1 vCPU" : "0.25 vCPU",
  memory: isProd ? "2 GB" : "0.5 GB",
  link: [heboDatabase, ...otelSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.api",
    tags: [apiDomain],
  },
  environment: {
    AUTH_URL: heboAuth.url,
    LOG_LEVEL: isProd ? "info" : "debug",
    NODE_ENV: isProd ? "production" : "development",
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: apiPort,
  },
  loadBalancer: {
    domain: apiDomain,
    rules: [
      { listen: "80/http", redirect: "443/https" },
      { listen: "443/https", forward: `${apiPort}/http` },
    ],
  },
  scaling: {
    min: isProd ? 2 : 1,
    max: isProd ? 4 : 1,
  },
  capacity: isProd ? undefined : "spot",
  wait: isProd,
});

createMigrator("api");

export default heboApi;
