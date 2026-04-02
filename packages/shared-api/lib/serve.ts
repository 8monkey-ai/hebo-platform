import cluster from "node:cluster";
import os from "node:os";

import type { AnyElysia } from "elysia";

import { IS_PRODUCTION } from "../env";

export function serve(
  factory: () => AnyElysia,
  port: number,
  name: string,
  options?: Record<string, unknown>,
) {
  const workers =
    Number(process.env.WORKERS) ||
    (IS_PRODUCTION && process.platform === "linux" ? os.availableParallelism() : 1);

  if (workers > 1 && cluster.isPrimary) {
    for (let i = 0; i < workers; i++) cluster.fork();
    return;
  }

  const app = factory().listen(options ? { port, ...options } : port);
  console.log(
    `🐵 ${name} running at ${app.server!.url}${workers > 1 ? ` (worker ${process.pid})` : ""}`,
  );
}
