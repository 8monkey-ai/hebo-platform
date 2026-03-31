import { AUTH_URL } from "../env";
import { getRootDomain } from "../utils/url";

const ROOT_DOMAIN = getRootDomain(AUTH_URL);

export const CORS_CONFIG = {
  origin: (request: Request) => {
    if (!ROOT_DOMAIN) return true;
    const origin = request.headers.get("origin");
    if (!origin || !origin.startsWith("https://")) return false;

    const hostname = origin.slice(8).split("/", 1)[0].split(":")[0];
    return hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`);
  },
  credentials: true,
  maxAge: 3600,
};
