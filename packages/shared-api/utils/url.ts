export function isRootPathUrl(url: string): boolean {
  const slash = url.indexOf("/", 8);
  if (slash === -1) return true;

  const next = slash + 1;
  if (next >= url.length) return true;

  const c = url.codePointAt(next);
  return c === 63 || c === 35;
}

export function withPort(base: string, port: number) {
  const url = new URL(base);
  url.port = String(port);
  return url.href;
}

const IPV4 = String.raw`(?:\d{1,3}\.){3}\d{1,3}`;
// Wildcard DNS services resolving `<ip>.<service>` to `<ip>`, e.g. `api.1.2.3.4.sslip.io`.
const IP_DNS = String.raw`(?:sslip\.io|nip\.io|traefik\.me)`;
// Suffixes where every next label has a different owner (a common subset of the Public Suffix List):
// ccTLD registry second levels, IP wildcard DNS and shared PaaS hosts. Falls back to the TLD.
const PUBLIC_SUFFIX = String.raw`(?:(?:co|com|net|org|edu|gov|ac|me|ne)\.[a-z]{2}|${IP_DNS}|vercel\.app|netlify\.app|pages\.dev|workers\.dev|fly\.dev|onrender\.com|herokuapp\.com|up\.railway\.app|github\.io|azurewebsites\.net|a\.run\.app|[^.]+)`;

const IP_ADDRESS = new RegExp(String.raw`^(?:${IPV4}|\[.+\])$`, "u");
// One label above the public suffix; a dotted IPv4 counts as a single label on IP wildcard DNS.
const ROOT_DOMAIN_PATTERN = new RegExp(
  String.raw`(?:${IPV4}\.${IP_DNS}|[^.]+\.${PUBLIC_SUFFIX})$`,
  "u",
);

export function getRootDomain(baseUrl: string | undefined) {
  if (!baseUrl) return;
  const { hostname } = new URL(baseUrl);
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return;
  if (IP_ADDRESS.test(hostname)) return hostname;

  return ROOT_DOMAIN_PATTERN.exec(hostname)?.[0] ?? hostname;
}
