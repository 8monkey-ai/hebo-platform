import { apiKey } from "@better-auth/api-key";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { emailOTP, organization } from "better-auth/plugins";

import { authSecret, authUrl, logLevel } from "@hebo/shared-api/env";
import { betterAuthCookieOptions, cookieDomain } from "@hebo/shared-api/lib/cookie-options";
import { createPrismaAdapter } from "@hebo/shared-api/lib/db/connection";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { PrismaClient } from "~auth/generated/prisma/client";

import { sendOrganizationInvitationEmail, sendVerificationOtpEmail } from "./lib/email";
import { createOrganizationHook, createSessionHook } from "./lib/organization";

export const prisma = new PrismaClient({
  adapter: createPrismaAdapter("auth"),
});

export const auth = betterAuth({
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "microsoft"],
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
    session: { create: { before: createSessionHook(prisma) } },
  },
  experimental: { joins: true },
  plugins: [
    apiKey({
      startingCharactersConfig: {
        shouldStore: true,
        charactersLength: 8,
      },
      defaultPrefix: "sk_",
      enableMetadata: true,
      rateLimit: {
        enabled: false,
      },
      customAPIKeyGetter: (ctx) =>
        ctx.request?.headers.get("authorization")?.replace("Bearer ", "") ?? null,
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
  secret: authSecret,
  session: {
    cookieCache: { enabled: true },
  },
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: await getSecret("GoogleClientId"),
      clientSecret: await getSecret("GoogleClientSecret"),
    },
    github: {
      clientId: await getSecret("GithubClientId"),
      clientSecret: await getSecret("GithubClientSecret"),
    },
    microsoft: {
      clientId: await getSecret("MicrosoftClientId"),
      clientSecret: await getSecret("MicrosoftClientSecret"),
    },
  },
  trustedOrigins: cookieDomain ? [`https://*.${cookieDomain}`] : ["*"],
});
