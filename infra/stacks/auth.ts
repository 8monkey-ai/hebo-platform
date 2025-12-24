import heboCluster from "./cluster";
import heboDatabase from "./db";
import { authSecrets, otelExporterSecrets, isProd } from "./env";
import heboVpc from "./network";

const authDomain = isProd ? "auth.hebo.ai" : `auth.${$app.stage}.hebo.ai`;
export const authUrl = `https://${authDomain}`;
const authPort = "3000";

const heboAuth = new sst.aws.Service("HeboAuth", {
  cluster: heboCluster,
  architecture: "arm64",
  cpu: isProd ? "1 vCPU" : "0.25 vCPU",
  memory: isProd ? "2 GB" : "0.5 GB",
  link: [heboDatabase, ...authSecrets, ...otelExporterSecrets],
  image: {
    context: ".",
    dockerfile: "infra/docker/Dockerfile.auth",
    tags: [authDomain],
  },
  environment: {
    IS_REMOTE: $dev ? "false" : "true",
    AUTH_URL: authUrl,
    AUTH_TRUSTED_ORIGINS: isProd
      ? "https://console.hebo.ai"
      : `https://console.${$app.stage}.hebo.ai`,
    LOG_LEVEL: isProd ? "info" : "debug",
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
  scaling: {
    min: isProd ? 2 : 1,
    max: isProd ? 16 : 1,
  },
  capacity: isProd ? undefined : "spot",
  wait: isProd,
});

const migrator = new sst.aws.Function("AuthDatabaseMigrator", {
  handler: "apps/auth/prisma/lambda/migrator.handler",
  vpc: heboVpc,
  link: [heboDatabase],
  copyFiles: [
    { from: "apps/auth/prisma", to: "./prisma" },
    { from: "apps/auth/prisma.config.ts", to: "./prisma.config.ts" },
  ],

  environment: {
    NODE_EXTRA_CA_CERTS: "/var/runtime/ca-cert.pem",
    // eslint-disable-next-line sonarjs/publicly-writable-directories -- Lambda /tmp is execution-isolated
    NPM_CONFIG_CACHE: "/tmp/.npm",
  },
  timeout: "300 seconds",
});

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new aws.lambda.Invocation("AuthDatabaseMigratorInvocation", {
  input: Date.now().toString(),
  functionName: migrator.name,
});

export default heboAuth;
