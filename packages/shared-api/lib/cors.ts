import { AUTH_URL } from "../env";
import { getRootDomain } from "../utils/url";

const ROOT_DOMAIN = getRootDomain(AUTH_URL);

export const CORS_CONFIG = {
  origin: (request: Request) => {
    if (!ROOT_DOMAIN) return true;
    if (!request.url.startsWith("https://")) return false;

    const host = request.url.slice(8).split("/", 1)[0];
    return host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`);
  },
  credentials: true,
  maxAge: 3600,
};
