const getPathStartIndex = (url: string) => {
  const schemeIdx = url.indexOf("://");
  return url.indexOf("/", schemeIdx + 3);
};

export function getPathnameFromUrl(url: string): string {
  const pathStart = getPathStartIndex(url);
  if (pathStart === -1) return "/";

  const queryStart = url.indexOf("?", pathStart);
  const hashStart = url.indexOf("#", pathStart);
  let pathEnd = url.length;
  if (queryStart !== -1) pathEnd = Math.min(pathEnd, queryStart);
  if (hashStart !== -1) pathEnd = Math.min(pathEnd, hashStart);

  const path = url.slice(pathStart, pathEnd);
  return path.length === 0 ? "/" : path;
}

export function isRootPathUrl(url: string): boolean {
  const slash = getPathStartIndex(url);
  if (slash === -1) return true;

  const next = slash + 1;
  if (next >= url.length) return true;

  const c = url.codePointAt(next);
  return c === 63 /* ? */ || c === 35 /* # */;
}
