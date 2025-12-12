import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { apiKey, emailOTP } from "better-auth/plugins";

import { prisma } from "@hebo/database/client";

import { getSecret } from "../utils/secrets";
import { sendVerificationOtpEmail } from "./email/send-verification-otp";
import { authBaseUrl, isAuthEnabled } from "./env";

const trustedOrigins = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? ["http://localhost:5173", "http://127.0.0.1:5173"];
const isRemote = process.env.IS_REMOTE === "true";
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
      clientId: await getSecret("GoogleClientId", isAuthEnabled),
      clientSecret: await getSecret("GoogleClientSecret", isAuthEnabled),
    },
    github: {
      clientId: await getSecret("GithubClientId", isAuthEnabled),
      clientSecret: await getSecret("GithubClientSecret", isAuthEnabled),
    },
    microsoft: {
      clientId: await getSecret("MicrosoftClientId", isAuthEnabled),
      clientSecret: await getSecret("MicrosoftClientSecret", isAuthEnabled),
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
  secret: await getSecret("AuthSecret", isAuthEnabled),
});
