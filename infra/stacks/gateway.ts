// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboAuth from "./auth";
import heboCluster from "./cluster";
import heboDatabase from "./db";
import { disableInitProcess } from "./ecs";
import { authSecret, isProduction, llmSecrets, greptimeHost, normalizedStage } from "./env";

const gatewayDomain = isProduction ? "gateway.hebo.ai" : `gateway.${normalizedStage}.hebo.ai`;
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
    tags: [gatewayDomain],
    args: { NODE_ENV: isProduction ? "production" : "development" },
  },
  environment: {
    HEBO_MODE: "gateway",
    AUTH_URL: heboAuth.url,
    GATEWAY_URL: `https://${gatewayDomain}`,
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

export default heboGateway;
