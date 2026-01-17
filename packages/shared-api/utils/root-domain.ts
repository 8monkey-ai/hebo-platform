export function getRootDomain(baseUrl: string) {
  const { hostname } = new URL(baseUrl);
  return hostname === "localhost"
    ? undefined
    : hostname.split(".").slice(-2).join(".");
}
