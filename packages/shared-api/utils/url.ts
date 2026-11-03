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

// Wildcard DNS services that map `<ip>.<service>` to the IP, so the IP part
// (not the service) identifies the deployment. Supported IP notations:
// dotted (`1.2.3.4`), dashed (`1-2-3-4`) and hex (`01020304`).
const WILDCARD_DNS_SERVICES = ["sslip.io", "nip.io", "traefik.me"];
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/u;

export function getRootDomain(baseUrl: string | undefined) {
  if (!baseUrl) return;
  const { hostname } = new URL(baseUrl);
  if (hostname === "localhost") return;

  // IP literals have no parent domain
  if (IPV4.test(hostname)) return hostname;

  const service = WILDCARD_DNS_SERVICES.find((s) => hostname.endsWith(`.${s}`));
  if (service) {
    const labels = hostname.slice(0, -service.length - 1).split(".");
    const dotted = labels.slice(-4);
    const ip = IPV4.test(dotted.join(".")) ? dotted : labels.slice(-1);
    return `${ip.join(".")}.${service}`;
  }

  const parts = hostname.split(".");
  const tld = parts.at(-1);
  const sld = parts.at(-2);

  // ccTLDs with a registry second level (e.g. co.uk, com.au, org.nz)
  const take3 = tld?.length === 2 && /^(co|com|net|org|edu|gov|ac|me|ne)$/u.test(sld ?? "");

  return parts.slice(take3 ? -3 : -2).join(".");
}
