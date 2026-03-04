import { slugFromName } from "@hebo/shared-api/utils/create-slug";

import type { PrismaClient } from "~auth/generated/prisma/client";

export const createOrganizationHook = (prisma: PrismaClient) => {
  return async (user: { id: string; name?: string | null; email: string }) => {
    await prisma.$transaction(async (tx) => {
      const org = await tx.organizations.create({
        data: {
          id: Bun.randomUUIDv7(),
          name: `${user.name || user.email}'s Org`,
          slug: slugFromName(user.name, user.email),
          createdAt: new Date(),
        },
      });
      await tx.members.create({
        data: {
          id: Bun.randomUUIDv7(),
          userId: user.id,
          organizationId: org.id,
          role: "owner",
          createdAt: new Date(),
        },
      });
      await tx.sessions.updateMany({
        where: { userId: user.id, activeOrganizationId: null },
        data: { activeOrganizationId: org.id },
      });
    });
  };
};

export const createSessionHook = (prisma: PrismaClient) => {
  return async (session: { userId: string }) => {
    // FUTURE: Define ordering of organizations
    const membership = await prisma.members.findFirst({
      where: { userId: session.userId },
    });
    return {
      data: { ...session, activeOrganizationId: membership?.organizationId },
    };
  };
};
