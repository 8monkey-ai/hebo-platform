import { Collection } from "@msw/data";
import { z } from "zod";

import { shellStore } from "~console/lib/shell";

import { DEFAULT_EXPIRATION_MS, type AuthService } from "./types";

const apiKeys = new Collection({
  schema: z.object({
    id: z.string().default(crypto.randomUUID()),
    name: z.string(),
    key: z.string(),
    createdAt: z.date(),
    expiresAt: z.date(),
  }),
});

const members = new Collection({
  schema: z.object({
    id: z.string().default(crypto.randomUUID()),
    userId: z.string(),
    role: z.string(),
    createdAt: z.string(),
    userName: z.string(),
    userEmail: z.string(),
  }),
});

const invitations = new Collection({
  schema: z.object({
    id: z.string().default(crypto.randomUUID()),
    email: z.string(),
    role: z.string(),
    expiresAt: z.string(),
    status: z.string(),
  }),
});

members.create({
  id: "member-1",
  userId: "dummy-user-id",
  role: "owner",
  createdAt: new Date().toISOString(),
  userName: "Dummy User",
  userEmail: "dummy@user.com",
});
members.create({
  id: "member-2",
  userId: "dummy-user-id-2",
  role: "member",
  createdAt: new Date().toISOString(),
  userName: "Jane Smith",
  userEmail: "jane@example.com",
});
invitations.create({
  id: "invite-1",
  email: "pending@example.com",
  role: "member",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "pending",
});

export const authService = {
  async ensureSignedIn() {
    if (shellStore.user?.organizationId) return true;
    shellStore.user = {
      userId: "dummy-user-id",
      organizationId: "dummy-org-id",
      name: "Dummy User",
      email: "dummy@user.com",
      initials: "DU",
      image: "",
    };
    return true;
  },

  async generateApiKey(name, expiresInMs = DEFAULT_EXPIRATION_MS) {
    const now = new Date();
    return await apiKeys.create({
      name,
      key: crypto.randomUUID(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresInMs),
    });
  },

  async revokeApiKey(apiKeyId: string) {
    apiKeys.delete((q) => q.where({ id: apiKeyId }));
  },

  async listApiKeys() {
    return apiKeys.findMany();
  },

  async signInWithOAuth() {
    globalThis.location.href = "/";
  },

  async sendMagicLinkEmail() {
    return "dummy nonce";
  },

  async signInWithMagicLink() {
    throw new Error("Magic Link not implemented");
  },

  async signOut() {
    shellStore.user = undefined;
  },

  async listOrganizations() {
    return [
      { id: "dummy-org-id", name: "Dummy Org", slug: "dummy-org" },
      { id: "dummy-org-id-2", name: "Second Org", slug: "second-org" },
    ];
  },

  async getOrganization() {
    return {
      members: members.findMany().map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        createdAt: m.createdAt,
        user: { name: m.userName, email: m.userEmail },
      })),
      invitations: invitations.findMany().map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
        status: i.status,
      })),
    };
  },

  async setActiveOrganization(orgId) {
    if (shellStore.user) shellStore.user.organizationId = orgId;
  },

  async refreshSession() {},

  async inviteMember(email, role) {
    invitations.create({
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    });
  },

  async removeMember(memberIdOrEmail) {
    members.delete((q) => q.where({ userEmail: memberIdOrEmail }));
  },

  async cancelInvitation(invitationId) {
    invitations.delete((q) => q.where({ id: invitationId }));
  },

  async acceptInvitation() {},
} satisfies AuthService;
