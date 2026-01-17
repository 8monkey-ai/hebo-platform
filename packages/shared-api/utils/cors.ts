import { authUrl } from "../env";
import { getRootDomain } from "./root-domain";

const rootDomain = getRootDomain(authUrl);
const escapeRegex = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

export const corsConfig = rootDomain
  ? {
      // Matches HTTPS origins for exact domain or subdomains
      origin: new RegExp(
        `^https:\\/\\/(?:${escapeRegex(rootDomain)}|(?:[a-z0-9-]+\\.)+${escapeRegex(rootDomain)})$`,
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
