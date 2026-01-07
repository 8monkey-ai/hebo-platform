export function getAuthHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ["cookie", "authorization", "origin"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}
