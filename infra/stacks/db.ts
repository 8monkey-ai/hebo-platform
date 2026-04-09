// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

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
      if (isProduction) {
        a.performanceInsightsEnabled = true;
        a.performanceInsightsRetentionPeriod = 465;
        // Enable after first deploy — requires PI to be active on the cluster first.
        a.databaseInsightsMode = "advanced";
      }
    },
  },
});

export const databaseUrl = $interpolate`postgresql://${heboDatabase.username}:${heboDatabase.password}@${heboDatabase.host}:${heboDatabase.port}/${heboDatabase.database}?sslmode=verify-full`;

export default heboDatabase;
