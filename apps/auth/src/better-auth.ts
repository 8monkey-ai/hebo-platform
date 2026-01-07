import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { apiKey, emailOTP, organization } from "better-auth/plugins";

import { createPrismaAdapter } from "@hebo/shared-api/lib/db/connection";
import { createOrgSlug } from "@hebo/shared-api/utils/create-slug";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { PrismaClient } from "~auth/generated/prisma/client";

import { sendVerificationOtpEmail } from "./lib/email";
import { isRemote } from "./lib/env";

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

async function ensureUserHasOrganization(
  userId: string,
  userName: string | null,
  email: string,
) {
  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.members.findFirst({ where: { userId } });
      if (existing) return existing;

      const org = await tx.organizations.create({
        data: {
          id: Bun.randomUUIDv7(),
          name: `${userName || email.split("@")[0]}'s Org`,
          slug: createOrgSlug(userName, email),
        },
      });
      return tx.members.create({
        data: {
          id: Bun.randomUUIDv7(),
          userId,
          organizationId: org.id,
          role: "owner",
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
}

const afterHook = createAuthMiddleware(async (ctx) => {
  const newSession = ctx.context.newSession;
  if (!newSession) return;

  const isNewUserPath =
    ctx.path.startsWith("/callback/") || ctx.path === "/sign-in/email-otp";

  const membership = isNewUserPath
    ? await ensureUserHasOrganization(
        newSession.user.id,
        newSession.user.name,
        newSession.user.email,
      )
    : // FUTURE: Define ordering of organizations
      await prisma.members.findFirst({ where: { userId: newSession.user.id } });

  const teams = ctx.headers
    ? await auth.api.listUserTeams({ headers: ctx.headers })
    : [];

  if (membership || teams.length > 0) {
    await prisma.sessions.update({
      where: { id: newSession.session.id },
      data: {
        ...(membership && { activeOrganizationId: membership.organizationId }),
        ...(teams.length > 0 && { teamIds: teams.map((team) => team.id) }),
      },
    });
  }
});

export const auth = betterAuth({
  baseURL,
  basePath: "/v1",
  accountLinking: {
    enabled: true,
    trustedProviders: ["google", "github", "microsoft"],
  },
  session: {
    additionalFields: {
      teamIds: {
        type: "string[]",
        required: false,
      },
    },
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
  hooks: { after: afterHook },
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
      organizationHooks: {
        afterCreateTeam: async ({ team, user }) => {
          if (!user) return;

          const sessions = await prisma.sessions.findMany({
            where: { userId: user.id },
          });

          await Promise.all(
            sessions.map((session) =>
              prisma.sessions.update({
                where: { id: session.id },
                data: { teamIds: [...(session.teamIds ?? []), team.id] },
              }),
            ),
          );
        },
      },
    }),
  ],
  trustedOrigins: cookieDomain ? [`https://*.${cookieDomain}`] : ["*"],
  secret: await getSecret("AuthSecret", false),
});
