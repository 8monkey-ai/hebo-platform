import {
  http,
  HttpResponse,
  type HttpHandler,
  type PathParams,
  type DefaultBodyType,
  type HttpResponseResolver,
} from "msw";

const CHAOS_NETWORK_RATE = Number(import.meta.env.VITE_CHAOS_NETWORK ?? 0.1);
const CHAOS_HTTP_RATE = Number(import.meta.env.VITE_CHAOS_HTTP ?? 0.2);

const chaosResolver: HttpResponseResolver<PathParams, DefaultBodyType> = (info) => {
  if (info.request.headers.get("x-no-chaos") === "1") return;

  const roll = Math.random();

  if (roll < CHAOS_NETWORK_RATE) return HttpResponse.error();

  if (roll < CHAOS_NETWORK_RATE + CHAOS_HTTP_RATE) {
    return HttpResponse.json(
      { code: "INTERNAL_SERVER_ERROR", message: "Injected 500" },
      { status: 500 },
    );
  }
};

// Wrap handlers with chaos injection.
export function addChaos(handlers: HttpHandler[]): HttpHandler[] {
  return handlers.flatMap((h) => {
    const method =
      typeof h.info?.method === "string"
        ? (h.info.method.toLowerCase() as keyof typeof http)
        : "all";
    const path = h.info?.path ?? /.*/;

    return [http[method](path, chaosResolver), h];
  });
}
