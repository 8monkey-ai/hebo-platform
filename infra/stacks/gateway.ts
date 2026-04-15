// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboAuth from "./auth";
import heboCluster from "./cluster";
import heboDatabase from "./db";
import { authSecret, isProduction, llmSecrets, greptimeHost } from "./env";
import heboGreptime from "./greptime";
import { disableInitProcess, albUrl, domain } from "./helpers";

const gatewayPort = "8522";

const heboGatewayAlbAccessLogs = new sst.aws.Bucket("HeboGatewayAlbAccessLogs", {
  cors: false,
  policy: [
    {
      principals: [
        {
          type: "service",
          identifiers: ["logdelivery.elasticloadbalancing.amazonaws.com"],
        },
      ],
      actions: ["s3:PutObject"],
      paths: ["*"],
    },
  ],
});

const heboGateway = new sst.aws.Service("HeboGateway", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProduction ? "1 vCPU" : "0.25 vCPU",
  memory: isProduction ? "4 GB" : "0.5 GB",
  permissions: [
    {
      actions: ["sts:AssumeRole"],
      resources: ["*"],
    },
  ],
  link: [heboDatabase, authSecret, ...llmSecrets, greptimeHost],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile",
    tags: [domain("gateway")],
    args: { NODE_ENV: isProduction ? "production" : "development" },
  },
  environment: {
    HEBO_MODE: "gateway",
    AUTH_URL: albUrl(heboAuth),
    BASE_URL: `https://${domain("gateway")}`,
    NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/rds-bundle.pem",
    PORT: gatewayPort,
    ...(heboGreptime ? { GREPTIME_HOST: heboGreptime.service } : {}),
  },
  loadBalancer: {
    rules: [{ listen: "80/http", forward: `${gatewayPort}/http` }],
  },
  transform: {
    taskDefinition: disableInitProcess,
    loadBalancer: (args) => {
      args.idleTimeout = 30 * 60; // 30 minutes
      args.accessLogs = {
        bucket: heboGatewayAlbAccessLogs.name,
        enabled: true,
        prefix: "gateway-alb",
      };
    },
  },
  scaling: {
    min: isProduction ? 2 : 1,
    max: isProduction ? 4 : 1,
  },
  capacity: isProduction ? undefined : "spot",
  wait: isProduction,
});

export default heboGateway;
