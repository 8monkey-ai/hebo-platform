import { delay, http, type HttpHandler } from "msw";

const METHOD_DELAYS: Partial<Record<keyof typeof http, number>> = {
  get: 500,
  post: 1000,
  patch: 1500,
  delete: 750,
};

export function addDelays(handlers: HttpHandler[]): HttpHandler[] {
  return handlers.flatMap((h) => {
    const method =
      typeof h.info?.method === "string"
        ? (h.info.method.toLowerCase() as keyof typeof http)
        : "all";
    const duration = method ? METHOD_DELAYS[method] : undefined;
    if (!method || !duration) return [h];
    const path = h.info?.path ?? /.*/u;

    return [http[method](path, () => delay(duration)), h];
  });
}
