import { createAuthMiddleware } from "better-auth/api";

import { slugFromName } from "@hebo/shared-api/utils/create-slug";

import type { PrismaClient } from "~auth/generated/prisma/client";

export async function ensureUserHasOrganization(
  prisma: PrismaClient,
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
          slug: slugFromName(userName, email),
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

export function createOrganizationHook(prisma: PrismaClient) {
  return createAuthMiddleware(async (ctx) => {
    const newSession = ctx.context.newSession;
    if (!newSession) return;

    const isNewUserPath =
      ctx.path.startsWith("/callback/") || ctx.path === "/sign-in/email-otp";

    const membership = isNewUserPath
      ? await ensureUserHasOrganization(
          prisma,
          newSession.user.id,
          newSession.user.name,
          newSession.user.email,
        )
      : // FUTURE: Define ordering of organizations
        await prisma.members.findFirst({
          where: { userId: newSession.user.id },
        });

    if (membership) {
      await prisma.sessions.update({
        where: { id: newSession.session.id },
        data: { activeOrganizationId: membership.organizationId },
      });
    }
  });
}
