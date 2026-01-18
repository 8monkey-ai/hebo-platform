import { authUrl } from "../env";
import { getRootDomain } from "./domains";

const rootDomain = getRootDomain(authUrl)?.replaceAll(".", String.raw`\.`);

export const corsConfig = rootDomain
  ? {
      // Matches HTTPS origins for exact domain or subdomains
      origin: new RegExp(
        `^https://(?:${rootDomain}|(?:[a-z0-9-]+\\.)+${rootDomain})$`,
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
