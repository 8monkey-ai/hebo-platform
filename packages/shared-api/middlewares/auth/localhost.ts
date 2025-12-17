import { Elysia } from "elysia";

const getIsLocalhost = async () => {
  try {
    const { default: isLocalhost } = await import("is-localhost-ip");
    return isLocalhost;
  } catch {
    throw new Error("is-localhost-ip not available");
  }
};

export const authServiceLocalhost = new Elysia({
  name: "authenticate-user-localhost",
})
  .onStart(async () => {
    console.warn(
      '⚠️ [auth] Localhost mode: userId="dummy"; non-local requests will be 401',
    );
  })
  .resolve(async function resolveLocalhostAuth({ request, server }) {
    const clientIp = ((ip) =>
      typeof ip === "string" ? ip : (ip?.address ?? ""))(
      server?.requestIP(request),
    );

    const hostname = new URL(request.url).hostname;

    const isLocalhost = await getIsLocalhost();

    const [ipIsLocal, hostIsLocal] = await Promise.all([
      isLocalhost(clientIp),
      isLocalhost(hostname),
    ]);

    return { userId: ipIsLocal && hostIsLocal ? "dummy" : undefined } as const;
  })
  .as("scoped");
