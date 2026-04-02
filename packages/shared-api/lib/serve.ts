import cluster from "node:cluster";
import os from "node:os";

type ListenArg = string | number | Record<string, unknown>;

// oxlint-disable-next-line typescript-eslint/no-explicit-any
export function serve(factory: () => any, port: ListenArg, name: string) {
  const supportsReusePort = process.platform === "linux";
  const workers = supportsReusePort ? os.availableParallelism() : 1;

  if (workers > 1 && cluster.isPrimary) {
    for (let i = 0; i < workers; i++) cluster.fork();
  } else {
    // oxlint-disable no-unsafe-assignment, no-unsafe-call, no-unsafe-member-access
    const app = factory().listen(port);
    console.log(
      `🐵 ${name} running at ${app.server!.url}${workers > 1 ? ` (worker ${process.pid})` : ""}`,
    );
  }
}
