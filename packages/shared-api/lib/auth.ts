import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";

import { prisma } from "@hebo/database/client";

import { getSecret } from "../utils/secrets";
import { sendVerificationOtpEmail } from "./email/send-verification-otp";

// TODO: this shouldn't be necessary
const authBaseUrl =
  process.env.AUTH_BASE_URL ??
  process.env.VITE_AUTH_BASE_URL ??
  `http://localhost:${process.env.PORT ?? 3001}`;

const trustedOrigins = (
  process.env.AUTH_TRUSTED_ORIGINS ??
  // eslint-disable-next-line sonarjs/no-clear-text-protocols
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const logSocial = process.env.NODE_ENV !== "production";
const useSecureCookies = process.env.NODE_ENV === "production";
// Set to the eTLD+1 (e.g., ".hebo.ai") so auth cookies flow to api/gateway.
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

export const auth = betterAuth({
  baseURL: authBaseUrl,
  basePath: "/auth",
  advanced: {
    useSecureCookies,
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      // Use apex (e.g., "hebo.ai") to cover api/gateway/app.
      domain: cookieDomain,
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: true,
    transaction: true,
    debugLogs: process.env.LOG_LEVEL === "debug",
  }),
  // TODO: this should be exposed only to api, gateway does not need to know this.
  socialProviders: {
    google: {
      clientId: await getSecret("GoogleClientId").then((id) => {
        if (logSocial) console.info("[BetterAuth][Google][clientId]", id);
        return id;
      }),
      clientSecret: await getSecret("GoogleClientSecret"),
    },
    github: {
      clientId: await getSecret("GithubClientId").then((id) => {
        if (logSocial) console.info("[BetterAuth][GitHub][clientId]", id);
        return id;
      }),
      clientSecret: await getSecret("GithubClientSecret"),
    },
    microsoft: {
      clientId: await getSecret("MicrosoftClientId").then((id) => {
        if (logSocial) console.info("[BetterAuth][Microsoft][clientId]", id);
        return id;
      }),
      clientSecret: await getSecret("MicrosoftClientSecret"),
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendVerificationOtpEmail({ email, otp });
      },
    }),
  ],
  trustedOrigins,
});
