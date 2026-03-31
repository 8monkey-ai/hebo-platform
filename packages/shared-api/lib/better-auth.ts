import { AUTH_URL, IS_PRODUCTION } from "../env";
import { getRootDomain } from "../utils/url";

// eTLD+1 domain for cross-subdomain cookies (e.g., "hebo.ai")
const ROOT_DOMAIN = getRootDomain(AUTH_URL);

export const COOKIE_CONFIG = {
  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(ROOT_DOMAIN),
      domain: ROOT_DOMAIN,
    },
    // FUTURE: security tradeoff - restore default once we have SSR session checks
    defaultCookieAttributes: {
      httpOnly: false,
    },
    useSecureCookies: IS_PRODUCTION,
  },
} as const;
