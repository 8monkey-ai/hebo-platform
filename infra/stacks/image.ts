// Pre-built image URI (set by CI or manually via HEBO_IMAGE env var)
const raw = process.env.HEBO_IMAGE?.trim();
export const heboImage = raw?.length ? raw : undefined;

export function disableInitProcess(args): undefined {
  args.containerDefinitions = args.containerDefinitions.apply((defs: string) =>
    defs.replace(/"initProcessEnabled"\s*:\s*true/g, '"initProcessEnabled":false'),
  );
}
