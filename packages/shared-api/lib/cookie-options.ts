import { authUrl, isProduction } from "../env";
import { getRootDomain } from "../utils/domains";

// eTLD+1 domain for cross-subdomain cookies (e.g., "hebo.ai")
const cookieDomain = getRootDomain(authUrl);
const useSecureCookies = isProduction ? true : false;

export const betterAuthCookieOptions = {
  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
    // FUTURE: security tradeoff - restore default once we have SSR session checks
    defaultCookieAttributes: {
      httpOnly: false,
    },
    useSecureCookies,
  },
} as const;

export { cookieDomain };
