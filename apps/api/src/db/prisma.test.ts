import { afterEach, describe, expect, it } from "bun:test";

import { createPrismaClient } from "./prisma";

const USER_A = "user-a";
const USER_B = "user-b";

const identityFederationConfig = {
  authMode: "identity-federation",
  serviceAccountEmail: "sample-sa@sample-project.iam.gserviceaccount.com",
  audience: "//iam.googleapis.com/projects/000000/locations/global/workloadIdentityPools/sample",
  location: "us-central1",
  project: "sample-project",
} as const;

const serviceAccountConfig = {
  authMode: "service-account",
  clientEmail: "sample-sa@sample-project.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nsample-private-key\n-----END PRIVATE KEY-----\n",
  location: "us-central1",
  project: "sample-project",
} as const;

const createdOrganizationIds: string[] = [];

const newOrganizationId = () => {
  const organizationId = `org-prisma-test-${crypto.randomUUID()}`;
  createdOrganizationIds.push(organizationId);
  return organizationId;
};

// Raw SQL, because the query extension forces `deleted_at: null` onto every
// `deleteMany`, which would leave soft-deleted rows behind.
afterEach(async () => {
  await Promise.all(
    createdOrganizationIds.splice(0).map((organizationId) => {
      const client = createPrismaClient(organizationId, USER_A);
      return client.$executeRaw`delete from api.provider_configs where organization_id = ${organizationId}`;
    }),
  );
});

describe("provider_configs.getUnredacted", () => {
  it("returns an identity-federation config saved by another member of the organization", async () => {
    const organizationId = newOrganizationId();
    await createPrismaClient(organizationId, USER_A).provider_configs.create({
      data: { provider_slug: "vertex", value: identityFederationConfig },
    });

    const config = await createPrismaClient(organizationId, USER_B).provider_configs.getUnredacted(
      "vertex",
    );

    expect(config).not.toBeNull();
    expect(config?.value).toEqual(identityFederationConfig);
    expect(config?.created_by).toBe(USER_A);
    expect(config?.organization_id).toBe(organizationId);
  });

  it("returns the real private key of a service-account config saved by another member", async () => {
    const organizationId = newOrganizationId();
    await createPrismaClient(organizationId, USER_A).provider_configs.create({
      data: { provider_slug: "vertex", value: serviceAccountConfig },
    });

    const config = await createPrismaClient(organizationId, USER_B).provider_configs.getUnredacted(
      "vertex",
    );

    expect(config?.value).toEqual(serviceAccountConfig);
    expect(config?.value).toHaveProperty("privateKey", serviceAccountConfig.privateKey);
  });

  it("does not return a config belonging to another organization", async () => {
    const organizationId = newOrganizationId();
    const otherOrganizationId = newOrganizationId();
    await createPrismaClient(organizationId, USER_A).provider_configs.create({
      data: { provider_slug: "vertex", value: serviceAccountConfig },
    });

    const config = await createPrismaClient(
      otherOrganizationId,
      USER_B,
    ).provider_configs.getUnredacted("vertex");

    expect(config).toBeNull();
  });

  it("does not return a soft-deleted config", async () => {
    const organizationId = newOrganizationId();
    const clientA = createPrismaClient(organizationId, USER_A);
    const created = await clientA.provider_configs.create({
      data: { provider_slug: "vertex", value: serviceAccountConfig },
    });
    await clientA.provider_configs.softDelete({ id: created.id });

    const config = await clientA.provider_configs.getUnredacted("vertex");

    expect(config).toBeNull();
  });
});

describe("provider_configs redaction", () => {
  it("masks the private key when read through the extended client", async () => {
    const organizationId = newOrganizationId();
    await createPrismaClient(organizationId, USER_A).provider_configs.create({
      data: { provider_slug: "vertex", value: serviceAccountConfig },
    });

    const config = await createPrismaClient(organizationId, USER_B).provider_configs.findFirst({
      where: { provider_slug: "vertex" },
    });

    expect(config?.value).toEqual({ ...serviceAccountConfig, privateKey: "***" });
  });
});
