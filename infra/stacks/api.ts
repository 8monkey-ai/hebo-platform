// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboAuth from "./auth";
import heboCluster from "./cluster";
import { databaseUrl } from "./db";
import { authSecret, heboImage, isProduction, greptimeHost, normalizedStage } from "./env";

const apiDomain = isProduction ? "api.hebo.ai" : `api.${normalizedStage}.hebo.ai`;
const apiPort = "8521";

const heboApi = new sst.aws.Service("HeboApi", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProduction ? "1 vCPU" : "0.25 vCPU",
  memory: isProduction ? "2 GB" : "0.5 GB",
  link: [authSecret, greptimeHost],
  image: heboImage,
  environment: {
    HEBO_MODE: "api",
    DATABASE_URL: databaseUrl,
    API_URL: `https://${apiDomain}`,
    AUTH_URL: heboAuth.url,
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

export default heboApi;
