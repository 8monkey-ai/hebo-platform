import { IS_PRODUCTION, ROOT_DOMAIN } from "../env";

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
