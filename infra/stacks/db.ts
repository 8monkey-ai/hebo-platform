import { isProduction, normalizedStage } from "./env";
import heboVpc from "./network";

const globalCluster = new aws.rds.GlobalCluster("HeboDbGlobal", {
  globalClusterIdentifier: `${normalizedStage}-hebo-db-global`,
  engine: "aurora-postgresql",
  engineVersion: "17.6",
  storageEncrypted: true,
});

const heboDatabase = new sst.aws.Aurora("HeboDatabase", {
  engine: "postgres",
  version: "17.6",
  vpc: heboVpc,
  replicas: isProduction ? 1 : 0,
  scaling: isProduction
    ? { min: "0.5 ACU" }
    : { min: "0 ACU", max: "4 ACU", pauseAfter: "20 minutes" },
  database: "hebo",
  transform: {
    cluster: (a) => {
      a.globalClusterIdentifier = globalCluster.id;
    },
  },
});

export function createMigrator(schema: string) {
  const migrator = new sst.aws.Function(`${schema}DatabaseMigrator`, {
    handler: "packages/shared-api/lib/db/lambda/migrator.handler",
    vpc: heboVpc,
    link: [heboDatabase],
    copyFiles: [
      { from: `apps/${schema}/prisma`, to: "./prisma" },
      { from: `apps/${schema}/prisma.config.ts`, to: "./prisma.config.ts" },
    ],
    environment: {
      NODE_EXTRA_CA_CERTS: "/var/runtime/ca-cert.pem",
      // eslint-disable-next-line sonarjs/publicly-writable-directories -- Lambda /tmp is execution-isolated
      NPM_CONFIG_CACHE: "/tmp/.npm",
    },
    timeout: "300 seconds",
  });

  // eslint-disable-next-line sonarjs/constructor-for-side-effects
  new aws.lambda.Invocation(`${schema}DatabaseMigratorInvocation`, {
    input: JSON.stringify({ schema }),
    functionName: migrator.name,
    triggers: { deployedAt: Date.now().toString() },
  });
}

export default heboDatabase;
