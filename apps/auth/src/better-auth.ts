import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { apiKey, emailOTP, organization } from "better-auth/plugins";

import { authUrl } from "@hebo/shared-api/env";
import { createPrismaAdapter } from "@hebo/shared-api/lib/db/connection";
import {
  betterAuthCookieOptions,
  cookieDomain,
} from "@hebo/shared-api/middlewares/auth/cookie-options";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { PrismaClient } from "~auth/generated/prisma/client";

import {
  sendOrganizationInvitationEmail,
  sendVerificationOtpEmail,
} from "./lib/email";
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
    debugLogs: process.env.LOG_LEVEL === "debug",
  }),
  databaseHooks: { session: { create: { before: createSessionHook(prisma) } } },
  experimental: { joins: true },
  hooks: { after: createOrganizationHook(prisma) },
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
        timeWindow: 1000 * 60 * 60, // Per hour
        maxRequests: 3600, // 3600 requests per hour
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
  secret: await getSecret("AuthSecret", false),
  session: {
    cookieCache: { enabled: true },
  },
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
  trustedOrigins: cookieDomain ? [`https://*.${cookieDomain}`] : ["*"],
});
