import { isProduction, normalizedStage } from "./env";

export const hostname = (sub: string) =>
  isProduction ? `${sub}.hebo.ai` : `${sub}.${normalizedStage}.hebo.ai`;

export const albUrl = (service) =>
  service.nodes.loadBalancer.dnsName.apply((dns: string) => `http://${dns}`);

export function disableInitProcess(args): undefined {
  args.containerDefinitions = args.containerDefinitions.apply((defs: string) =>
    defs.replace(/"initProcessEnabled"\s*:\s*true/g, '"initProcessEnabled":false'),
  );
}
