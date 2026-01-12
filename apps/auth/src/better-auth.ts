import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { apiKey, emailOTP, organization } from "better-auth/plugins";

import { createPrismaAdapter } from "@hebo/shared-api/lib/db/connection";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { PrismaClient } from "~auth/generated/prisma/client";

import {
  sendOrganizationInvitationEmail,
  sendVerificationOtpEmail,
} from "./lib/email";
import { isRemote } from "./lib/env";
import { createOrganizationHook, createSessionHook } from "./lib/organization";

export const prisma = new PrismaClient({
  adapter: createPrismaAdapter("auth"),
});

const baseURL = process.env.AUTH_URL || `http://localhost:3000`;

// Set to the eTLD+1 (e.g., "hebo.ai") so auth cookies flow to api/gateway.
function getCookieDomain() {
  const { hostname } = new URL(baseURL);
  return hostname === "localhost"
    ? undefined
    : hostname.split(".").slice(-2).join(".");
}
const cookieDomain = getCookieDomain();

export const auth = betterAuth({
  baseURL,
  basePath: "/v1",
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "microsoft"],
  },
  advanced: {
    useSecureCookies: isRemote,
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
    database: {
      generateId: () => Bun.randomUUIDv7(),
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: true,
    transaction: true,
    debugLogs: process.env.LOG_LEVEL === "debug",
  }),
  databaseHooks: { session: { create: { before: createSessionHook(prisma) } } },
  hooks: { after: createOrganizationHook(prisma) },
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
      enableMetadata: true,
      enableSessionForAPIKeys: true,
      rateLimit: {
        enabled: true,
        timeWindow: 60 * 1000,
        maxRequests: 100,
      },
      customAPIKeyGetter: (ctx) =>
        ctx.request?.headers.get("authorization")?.replace("Bearer ", "") ??
        // eslint-disable-next-line unicorn/no-null
        null,
    }),
    emailOTP({
      async sendVerificationOTP({ email, otp }, ctx) {
        await sendVerificationOtpEmail({
          email,
          otp,
          consoleUrl: ctx?.request?.headers.get("origin") ?? undefined,
        });
      },
    }),
    organization({
      teams: { enabled: true },
      schema: {
        team: {
          additionalFields: {
            agentSlug: {
              type: "string",
              input: true,
              required: true,
            },
          },
        },
      },
      async sendInvitationEmail(data, ctx) {
        await sendOrganizationInvitationEmail({
          email: data.email,
          invitationId: data.id,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          inviterEmail: data.inviter.user.email,
          consoleUrl: ctx?.headers.get("origin") ?? undefined,
        });
      },
    }),
  ],
  trustedOrigins: cookieDomain ? [`https://*.${cookieDomain}`] : ["*"],
  secret: await getSecret("AuthSecret", false),
});
