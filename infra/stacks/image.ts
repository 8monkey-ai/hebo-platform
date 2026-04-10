// Pre-built image URI (set by CI or manually via HEBO_IMAGE env var)
export const heboImage = process.env.HEBO_IMAGE;

export function disableInitProcess(args): undefined {
  args.containerDefinitions = args.containerDefinitions.apply((defs: string) =>
    defs.replace(/"initProcessEnabled"\s*:\s*true/g, '"initProcessEnabled":false'),
  );
}
