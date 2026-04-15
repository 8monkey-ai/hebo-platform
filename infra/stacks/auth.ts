// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import heboDatabase, { createMigrator } from "./db";
import { authSecrets, isProduction, greptimeHost } from "./env";
import { disableInitProcess, hostname } from "./helpers";

const authPort = "8523";

const heboAuth = new sst.aws.Service("HeboAuth", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProduction ? "1 vCPU" : "0.25 vCPU",
  memory: isProduction ? "2 GB" : "0.5 GB",
  link: [heboDatabase, ...authSecrets, greptimeHost],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile",
    tags: [hostname("auth")],
    args: { NODE_ENV: isProduction ? "production" : "development" },
  },
  environment: {
    HEBO_MODE: "auth",
    BASE_URL: `https://${hostname("auth")}`,
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: authPort,
  },
  loadBalancer: {
    rules: [{ listen: "80/http", forward: `${authPort}/http` }],
  },
  transform: {
    taskDefinition: disableInitProcess,
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
