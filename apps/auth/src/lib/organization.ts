import { greptimeSqlClient } from "@hebo/shared-api/db/greptime";
import { ensureTenantTraceTable } from "@hebo/shared-api/lib/trace-table";
import { slugFromName } from "@hebo/shared-api/utils/slug";

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
    let orgId: string | undefined;

    await prisma.$transaction(async (tx) => {
      const org = await tx.organizations.create({
        data: {
          id: Bun.randomUUIDv7(),
          // oxlint-disable-next-line prefer-nullish-coalescing
          name: `${user.name || user.email}'s Org`,
          slug: slugFromName(user.name, user.email),
          createdAt: new Date(),
        },
      });
      orgId = org.id;
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

    // Provision a per-tenant Greptime trace table (best-effort, non-blocking).
    // If this fails the table will be auto-created on first OTLP ingest via the pipeline,
    // or can be retried via the provision-tenant-trace-tables migration script.
    if (orgId) ensureTenantTraceTable(greptimeSqlClient, orgId).catch(() => {});
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
