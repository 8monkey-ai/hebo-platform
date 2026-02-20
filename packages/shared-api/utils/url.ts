export function getPathnameFromUrl(url: string): string {
  const start = url.indexOf("/", 8);
  if (start === -1) return "/";

  let end = start;
  for (; end < url.length; end++) {
    const c = url.codePointAt(end);
    if (c === 63 || c === 35) break; // '?' or '#'
  }

  if (end === start) return "/";
  return url.slice(start, end);
}

export function isRootPathUrl(url: string): boolean {
  const slash = url.indexOf("/", 8);
  if (slash === -1) return true;

  const next = slash + 1;
  if (next >= url.length) return true;

  const c = url.codePointAt(next);
  return c === 63 || c === 35;
}
