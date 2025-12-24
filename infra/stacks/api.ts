import { authUrl } from "./auth";
import heboCluster from "./cluster";
import heboDatabase from "./db";
import { otelExporterSecrets, isProd } from "./env";
import heboVpc from "./network";

const apiDomain = isProd ? "api.hebo.ai" : `api.${$app.stage}.hebo.ai`;
const apiPort = "3001";

const heboApi = new sst.aws.Service("HeboApi", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProd ? "1 vCPU" : "0.25 vCPU",
  memory: isProd ? "2 GB" : "0.5 GB",
  link: [heboDatabase, ...otelExporterSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.api",
    tags: [apiDomain],
  },
  environment: {
    IS_REMOTE: $dev ? "false" : "true",
    AUTH_URL: authUrl,
    LOG_LEVEL: isProd ? "info" : "debug",
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
    max: isProd ? 16 : 1,
  },
  capacity: isProd ? undefined : "spot",
  wait: isProd,
});

const migrator = new sst.aws.Function("ApiDatabaseMigrator", {
  handler: "apps/api/prisma/lambda/migrator.handler",
  vpc: heboVpc,
  link: [heboDatabase],
  copyFiles: [
    { from: "apps/api/prisma", to: "./prisma" },
    { from: "apps/api/prisma.config.ts", to: "./prisma.config.ts" },
  ],

  environment: {
    NODE_EXTRA_CA_CERTS: "/var/runtime/ca-cert.pem",
    // eslint-disable-next-line sonarjs/publicly-writable-directories -- Lambda /tmp is execution-isolated
    NPM_CONFIG_CACHE: "/tmp/.npm",
  },
  timeout: "300 seconds",
});

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new aws.lambda.Invocation("ApiDatabaseMigratorInvocation", {
  input: Date.now().toString(),
  functionName: migrator.name,
});

export default heboApi;
