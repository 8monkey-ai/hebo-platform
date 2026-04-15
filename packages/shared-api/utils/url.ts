export function isRootPathUrl(url: string): boolean {
  const slash = url.indexOf("/", 8);
  if (slash === -1) return true;

  const next = slash + 1;
  if (next >= url.length) return true;

  const c = url.codePointAt(next);
  return c === 63 || c === 35;
}

export function getRootDomain(baseUrl: string | undefined) {
  if (!baseUrl) return;
  const { hostname } = new URL(baseUrl);
  if (hostname === "localhost") return;

  const parts = hostname.split(".");
  const tld = parts.at(-1);
  const sld = parts.at(-2);

  // ccTLDs with a registry second level (e.g. co.uk, com.au, org.nz)
  const take3 = tld?.length === 2 && /^(co|com|net|org|edu|gov|ac|me|ne)$/.test(sld ?? "");

  return parts.slice(take3 ? -3 : -2).join(".");
}
