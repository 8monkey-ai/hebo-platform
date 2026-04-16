import { apiKey } from "@better-auth/api-key";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { emailOTP, organization } from "better-auth/plugins";

import { createPrismaAdapter } from "@hebo/shared-api/db/postgres";
import { AUTH_SECRET, AUTH_URL, LOG_LEVEL, LOG_SEVERITY } from "@hebo/shared-api/env";
import { COOKIE_CONFIG } from "@hebo/shared-api/lib/better-auth";
import { createOtelLogger } from "@hebo/shared-api/lib/otel";
import { createPinoOtelAdapter } from "@hebo/shared-api/utils/otel-pino";
import { getSecret } from "@hebo/shared-api/utils/secret";
import { getRootDomain } from "@hebo/shared-api/utils/url";

import { PrismaClient } from "~auth/generated/prisma/client";

import { verifyApiKeyPlugin, type AuthWithApiKeyPlugin } from "./lib/api-key";
import {
  HAS_SMTP_CONFIG,
  sendOrganizationInvitationEmail,
  sendVerificationOtpEmail,
} from "./lib/email";
import { createOrganizationHook, syncActiveOrganizationHook } from "./lib/organization";

const prisma = new PrismaClient({
  adapter: createPrismaAdapter("auth"),
});

const ROOT_DOMAIN = getRootDomain(AUTH_URL);

const authLogger = createPinoOtelAdapter(createOtelLogger("hebo-auth", LOG_SEVERITY));

const [
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
] = await Promise.all([
  getSecret("GOOGLE_CLIENT_ID"),
  getSecret("GOOGLE_CLIENT_SECRET"),
  getSecret("GITHUB_CLIENT_ID"),
  getSecret("GITHUB_CLIENT_SECRET"),
  getSecret("MICROSOFT_CLIENT_ID"),
  getSecret("MICROSOFT_CLIENT_SECRET"),
]);

export const auth = betterAuth({
  baseURL: AUTH_URL,
  basePath: "/v1",
  secret: AUTH_SECRET,
  logger: {
    level: LOG_LEVEL,
    log: (level, message) => {
      authLogger[level](message);
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "microsoft", "email-password"],
  },
  emailAndPassword: {
    enabled: !HAS_SMTP_CONFIG,
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
  session: {
    cookieCache: { enabled: true },
  },
  trustedOrigins: ROOT_DOMAIN ? [`https://*.${ROOT_DOMAIN}`] : ["*"],
  advanced: {
    ...COOKIE_CONFIG.advanced,
    database: {
      generateId: () => Bun.randomUUIDv7(),
    },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    usePlural: true,
    transaction: true,
    debugLogs: LOG_LEVEL === "debug",
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
});
