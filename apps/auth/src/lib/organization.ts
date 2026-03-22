import { slugFromName } from "@hebo/shared-api/utils/create-slug";

import type { Prisma, PrismaClient } from "~auth/generated/prisma/client";

const updateOrganizationInSession = (
  tx: Prisma.TransactionClient,
  userId: string,
  orgId: string | null,
) =>
  tx.sessions.updateMany({
    where: { userId },
    data: { activeOrganizationId: orgId },
  });

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
      await updateOrganizationInSession(tx, user.id, org.id);
    });
  };
};

export const syncActiveOrganizationHook = (prisma: PrismaClient) => {
  return async (session: { userId: string; activeOrganizationId?: string | null }) => {
    if (session.activeOrganizationId != null) return;
    await prisma.$transaction(async (tx) => {
      const orgId = (await tx.members.findFirst({ where: { userId: session.userId } }))
        ?.organizationId;
      await updateOrganizationInSession(tx, session.userId, orgId ?? null);
    });
  };
};
