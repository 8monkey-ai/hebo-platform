import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { apiKey, emailOTP } from "better-auth/plugins";

import { prisma } from "@hebo/database/client";

import { getSecret } from "../utils/secrets";
import { sendVerificationOtpEmail } from "./email/send-verification-otp";
import { authBaseUrl, isRemote, trustedOrigins } from "./env";

// Set to the eTLD+1 (e.g., "hebo.ai") so auth cookies flow to api/gateway.
const cookieDomain = isRemote ? "hebo.ai" : undefined;

export const auth = betterAuth({
  baseURL: authBaseUrl,
  basePath: "/auth",
  advanced: {
    useSecureCookies: isRemote,
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: true,
    transaction: true,
    debugLogs: process.env.LOG_LEVEL === "debug",
  }),
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: await getSecret("GoogleClientId", false),
      clientSecret: await getSecret("GoogleClientSecret", false),
    },
    github: {
      clientId: await getSecret("GithubClientId", false),
      clientSecret: await getSecret("GithubClientSecret", false),
    },
    microsoft: {
      clientId: await getSecret("MicrosoftClientId", false),
      clientSecret: await getSecret("MicrosoftClientSecret", false),
    },
  },
  plugins: [
    apiKey({
      startingCharactersConfig: {
        shouldStore: true,
        charactersLength: 8,
      },
      defaultPrefix: "sk_",
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendVerificationOtpEmail({ email, otp });
      },
    }),
  ],
  trustedOrigins,
  secret: await getSecret("AuthSecret", false),
});
