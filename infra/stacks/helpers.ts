// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

import { isProduction } from "./env";

export const normalizedStage = $app.stage
  .trim()
  .toLowerCase()
  .replaceAll(/[^a-z0-9]+/g, "-")
  .replaceAll(/^-+|-+$/g, "");

export const domain = (sub: string) =>
  isProduction ? `${sub}.hebo.ai` : `${sub}.${normalizedStage}.hebo.ai`;

export const albUrl = (service) =>
  service.nodes.loadBalancer.dnsName.apply((dns: string) => `http://${dns}`);

export function disableInitProcess(args): undefined {
  args.containerDefinitions = args.containerDefinitions.apply((defs: string) =>
    defs.replace(/"initProcessEnabled"\s*:\s*true/g, '"initProcessEnabled":false'),
  );
}
