// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboVpc from "./network";

const heboCluster = new sst.aws.Cluster("HeboCluster", { vpc: heboVpc });

export default heboCluster;
