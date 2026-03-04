// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

const heboVpc = new sst.aws.Vpc("HeboVpc", { az: 3, nat: "managed" });

export default heboVpc;
