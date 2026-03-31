import { AUTH_URL } from "../env";
import { getRootDomain } from "../utils/url";

const rootDomain = getRootDomain(AUTH_URL)?.replaceAll(".", String.raw`\.`);

export const corsConfig = rootDomain
  ? {
      // Matches HTTPS origins for exact domain or subdomains
      origin: new RegExp(
        String.raw`^https://(?:${rootDomain}|(?:[a-z0-9-]+\.)+${rootDomain})$`,
        "i",
      ),
      credentials: true,
      // reduces noise of OPTION calls without compromising security
      maxAge: 3600,
    }
  : {
      origin: true,
      credentials: true,
      maxAge: 3600,
    };
