import { isProd } from "./env";
import heboVpc from "./network";

const globalCluster = new aws.rds.GlobalCluster("HeboDbGlobal", {
  globalClusterIdentifier: `${$app.stage}-hebo-db-global`,
  engine: "aurora-postgresql",
  engineVersion: "17.6",
  storageEncrypted: true,
});

const heboDatabase = new sst.aws.Aurora("HeboDatabase", {
  engine: "postgres",
  version: "17.6",
  vpc: heboVpc,
  replicas: isProd ? 1 : 0,
  scaling: isProd
    ? { min: "0.5 ACU" }
    : { min: "0 ACU", max: "4 ACU", pauseAfter: "20 minutes" },
  database: "hebo",
  transform: {
    cluster: (a) => {
      a.globalClusterIdentifier = globalCluster.id;
    },
  },
});

const migrator = new sst.aws.Function("DatabaseMigrator", {
  handler: "packages/database/lambda/migrator.handler",
  vpc: heboVpc,
  link: [heboDatabase],
  copyFiles: [{ from: "packages/database/prisma", to: "./prisma" }],

  environment: {
    NODE_EXTRA_CA_CERTS: "/var/runtime/ca-cert.pem",
    // eslint-disable-next-line sonarjs/publicly-writable-directories -- Lambda /tmp is execution-isolated
    NPM_CONFIG_CACHE: "/tmp/.npm",
  },
  timeout: "300 seconds",
});

// eslint-disable-next-line sonarjs/constructor-for-side-effects
new aws.lambda.Invocation("DatabaseMigratorInvocation", {
  input: Date.now().toString(),
  functionName: migrator.name,
});

export default heboDatabase;
