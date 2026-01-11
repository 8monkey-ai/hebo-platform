import { createAuthMiddleware } from "better-auth/api";

import { slugFromName } from "@hebo/shared-api/utils/create-slug";

import type { PrismaClient } from "~auth/generated/prisma/client";

export const createOrganizationHook = (prisma: PrismaClient) => {
  return createAuthMiddleware(async (ctx) => {
    const newSession = ctx.context.newSession;
    if (!newSession) return;

    const isNewUser =
      ctx.path.startsWith("/callback/") || ctx.path === "/sign-in/email-otp";
    if (!isNewUser) return;

    const existing = await prisma.members.findFirst({
      where: { userId: newSession.user.id },
    });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
      const org = await tx.organizations.create({
        data: {
          id: Bun.randomUUIDv7(),
          name: `${newSession.user.name || newSession.user.email.split("@")[0]}'s Org`,
          slug: slugFromName(newSession.user.name, newSession.user.email),
        },
      });
      await tx.members.create({
        data: {
          id: Bun.randomUUIDv7(),
          userId: newSession.user.id,
          organizationId: org.id,
          role: "owner",
        },
      });
      await tx.sessions.update({
        where: { id: newSession.session.id },
        data: { activeOrganizationId: org.id },
      });
    });
  });
};

export const createSessionHook = (prisma: PrismaClient) => {
  return async (session: { userId: string }) => {
    const membership = await prisma.members.findFirst({
      where: { userId: session.userId },
    });
    return {
      data: { ...session, activeOrganizationId: membership?.organizationId },
    };
  };
};
