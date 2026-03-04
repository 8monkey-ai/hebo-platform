// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import heboCluster from "./cluster";
import { isProduction } from "./env";

const heboGreptime = isProduction
  ? undefined
  : new sst.aws.Service("HeboGreptime", {
      cluster: heboCluster,
      architecture: "arm64",
      cpu: "0.25 vCPU",
      memory: "0.5 GB",
      image: "greptime/greptimedb:v1.0.0-rc.1",
      command: [
        "standalone",
        "start",
        "--http-addr=0.0.0.0:4000",
        "--rpc-bind-addr=0.0.0.0:4001",
        "--mysql-addr=0.0.0.0:4002",
        "--postgres-addr=0.0.0.0:4003",
      ],
      scaling: {
        min: 1,
        max: 1,
      },
      capacity: "spot",
      wait: false,
    });

export default heboGreptime;
