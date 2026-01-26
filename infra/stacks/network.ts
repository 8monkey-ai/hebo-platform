// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

const heboVpc = new sst.aws.Vpc("HeboVpc", { nat: "managed" });

export default heboVpc;
