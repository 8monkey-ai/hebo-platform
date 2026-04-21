// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboAuth from "./auth";
import heboCluster from "./cluster";
import heboDatabase, { createMigrator } from "./db";
import { authSecret, isProduction, greptimeHost } from "./env";
import heboGreptime from "./greptime";
import { disableInitProcess, hostname } from "./helpers";

const apiPort = "8521";

const heboApi = new sst.aws.Service("HeboApi", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProduction ? "1 vCPU" : "0.25 vCPU",
  memory: isProduction ? "2 GB" : "0.5 GB",
  link: [heboDatabase, authSecret, greptimeHost],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile",
    tags: [hostname("api")],
    args: { NODE_ENV: isProduction ? "production" : "development" },
  },
  environment: {
    HEBO_MODE: "api",
    BASE_URL: `https://${hostname("api")}`,
    AUTH_URL: heboAuth.url,
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: apiPort,
    ...(heboGreptime ? { GREPTIME_HOST: heboGreptime.service } : {}),
  },
  loadBalancer: {
    domain: hostname("api-origin"),
    rules: [
      { listen: "80/http", forward: `${apiPort}/http` },
      { listen: "443/https", forward: `${apiPort}/http` },
    ],
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

createMigrator("api");

export const apiRouter = new sst.aws.Router("HeboApiRouter", {
  domain: hostname("api"),
});
apiRouter.route("/", heboApi.url);

export default heboApi;
