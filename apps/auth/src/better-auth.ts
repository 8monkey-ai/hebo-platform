import { apiKey } from "@better-auth/api-key";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { emailOTP, organization } from "better-auth/plugins";

import { authSecret, authUrl, logLevel } from "@hebo/shared-api/env";
import { betterAuthCookieOptions, cookieDomain } from "@hebo/shared-api/lib/cookie-options";
import { createPrismaAdapter } from "@hebo/shared-api/lib/db/postgres";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { PrismaClient } from "~auth/generated/prisma/client";

import {
  HAS_SMTP_CONFIG,
  sendOrganizationInvitationEmail,
  sendVerificationOtpEmail,
} from "./lib/email";
import { createOrganizationHook, syncActiveOrganizationHook } from "./lib/organization";
import { verifyApiKeyPlugin, type AuthWithApiKeyPlugin } from "./lib/verify-api-key-plugin";

export const prisma = new PrismaClient({
  adapter: createPrismaAdapter("auth"),
});

const [
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
] = await Promise.all([
  getSecret("GoogleClientId"),
  getSecret("GoogleClientSecret"),
  getSecret("GithubClientId"),
  getSecret("GithubClientSecret"),
  getSecret("MicrosoftClientId"),
  getSecret("MicrosoftClientSecret"),
]);

export const auth = betterAuth({
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "microsoft", "email-password"],
  },
  emailAndPassword: {
    enabled: !HAS_SMTP_CONFIG,
  },
  advanced: {
    ...betterAuthCookieOptions.advanced,
    database: {
      generateId: () => Bun.randomUUIDv7(),
    },
  },
  basePath: "/v1",
  baseURL: authUrl,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: true,
    transaction: true,
    debugLogs: logLevel === "debug",
  }),
  databaseHooks: {
    user: { create: { after: createOrganizationHook(prisma) } },
    session: {
      create: { after: syncActiveOrganizationHook(prisma) },
      update: { after: syncActiveOrganizationHook(prisma) },
    },
  },
  experimental: { joins: true },
  plugins: [
    apiKey({
      references: "organization",
      startingCharactersConfig: {
        shouldStore: true,
        charactersLength: 8,
      },
      defaultPrefix: "sk_",
      enableMetadata: true,
      rateLimit: {
        enabled: false,
      },
      customAPIKeyGetter: (ctx) => ctx.request?.headers.get("authorization")?.slice(7) ?? null,
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
      organizationHooks: {
        // FUTURE: consider using after hook on database.member.delete
        // https://github.com/better-auth/better-auth/issues/8653
        afterRemoveMember: async ({ member }) => {
          await syncActiveOrganizationHook(prisma)({ userId: member.userId });
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
    verifyApiKeyPlugin((): AuthWithApiKeyPlugin => auth as unknown as AuthWithApiKeyPlugin),
  ],
  secret: authSecret,
  session: {
    cookieCache: { enabled: true },
  },
  socialProviders: {
    ...(GOOGLE_CLIENT_ID && {
      google: {
        prompt: "select_account",
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
      },
    }),
    ...(GITHUB_CLIENT_ID && {
      github: {
        clientId: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
      },
    }),
    ...(MICROSOFT_CLIENT_ID && {
      microsoft: {
        clientId: MICROSOFT_CLIENT_ID,
        clientSecret: MICROSOFT_CLIENT_SECRET,
      },
    }),
  },
  trustedOrigins: cookieDomain ? [`https://*.${cookieDomain}`] : ["*"],
});
