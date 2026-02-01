// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import heboDatabase, { createMigrator } from "./db";
import { authSecrets, otelSecrets, isProduction, normalizedStage } from "./env";

const authDomain = isProduction
  ? "auth.hebo.ai"
  : `auth.${normalizedStage}.hebo.ai`;
const authPort = "3000";

const heboAuth = new sst.aws.Service("HeboAuth", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProduction ? "1 vCPU" : "0.25 vCPU",
  memory: isProduction ? "2 GB" : "0.5 GB",
  link: [heboDatabase, ...authSecrets, ...otelSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.auth",
    tags: [authDomain],
    args: {
      NODE_ENV: isProduction ? "production" : "development",
    },
  },
  environment: {
    AUTH_URL: `https://${authDomain}`,
    LOG_LEVEL: isProduction ? "info" : "debug",
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: authPort,
  },
  loadBalancer: {
    domain: authDomain,
    rules: [
      { listen: "80/http", redirect: "443/https" },
      { listen: "443/https", forward: `${authPort}/http` },
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
    min: isProduction ? 2 : 1,
    max: isProduction ? 4 : 1,
  },
  capacity: isProduction ? undefined : "spot",
  wait: isProduction,
});

createMigrator("auth");

export default heboAuth;
