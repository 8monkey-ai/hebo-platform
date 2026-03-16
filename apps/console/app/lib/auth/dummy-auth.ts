import { Collection } from "@msw/data";
import { z } from "zod";

import { shellStore } from "~console/lib/shell";

import { DEFAULT_EXPIRATION_MS, type AuthService } from "./types";

const apiKeys = new Collection({
  schema: z.object({
    id: z.string().default(() => crypto.randomUUID()),
    name: z.string(),
    key: z.string(),
    createdAt: z.date(),
    expiresAt: z.date(),
  }),
});

const members = new Collection({
  schema: z.object({
    id: z.string().default(() => crypto.randomUUID()),
    organizationId: z.string(),
    userId: z.string(),
    role: z.string(),
    createdAt: z.string(),
    userName: z.string(),
    userEmail: z.string(),
  }),
});

const invitations = new Collection({
  schema: z.object({
    id: z.string().default(() => crypto.randomUUID()),
    organizationId: z.string(),
    email: z.string(),
    role: z.string(),
    expiresAt: z.string(),
    status: z.string(),
  }),
});

members.create({
  id: "member-1",
  organizationId: "dummy-org-id",
  userId: "dummy-user-id",
  role: "owner",
  createdAt: new Date().toISOString(),
  userName: "Dummy User",
  userEmail: "dummy@user.com",
});
members.create({
  id: "member-2",
  organizationId: "dummy-org-id",
  userId: "dummy-user-id-2",
  role: "member",
  createdAt: new Date().toISOString(),
  userName: "Jane Smith",
  userEmail: "jane@example.com",
});
invitations.create({
  id: "invite-1",
  organizationId: "dummy-org-id",
  email: "pending@example.com",
  role: "member",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "pending",
});

export const authService = {
  async ensureSignedIn() {
    if (shellStore.user?.organizationId) return true;
    const persistedOrgId = globalThis.localStorage?.getItem("hebo:dummy-org-id") ?? "dummy-org-id";
    shellStore.user = {
      userId: "dummy-user-id",
      organizationId: persistedOrgId,
      name: "Dummy User",
      email: "dummy@user.com",
      initials: "DU",
      image: "",
    };
    shellStore.organizations = [
      { id: "dummy-org-id", name: "Dummy Org", slug: "dummy-org" },
      { id: "dummy-org-id-2", name: "Second Org", slug: "second-org" },
    ];
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
    shellStore.organizations = [];
  },

  async getOrganization() {
    const organizationId = shellStore.user?.organizationId;
    return {
      members: members
        .findMany()
        .filter((m) => m.organizationId === organizationId)
        .map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          createdAt: m.createdAt,
          user: { name: m.userName, email: m.userEmail },
        })),
      invitations: invitations
        .findMany()
        .filter((i) => i.organizationId === organizationId)
        .map((i) => ({
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
    globalThis.localStorage?.setItem("hebo:dummy-org-id", orgId);
    globalThis.location.reload();
  },

  async inviteMember(email, role) {
    const organizationId = shellStore.user?.organizationId;
    if (!organizationId) throw new Error("No active organization");
    invitations.create({
      organizationId,
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

  async acceptInvitation(invitationId) {
    const invite = invitations.findFirst((q) => q.where({ id: invitationId, status: "pending" }));
    if (!invite) throw new Error("Invitation not found or already accepted.");
    if (Date.parse(invite.expiresAt) <= Date.now()) {
      throw new Error("Invitation has expired.");
    }
    invitations.delete((q) => q.where({ id: invitationId }));
    members.create({
      organizationId: invite.organizationId,
      userId: `accepted-${invitationId}`,
      role: invite.role,
      createdAt: new Date().toISOString(),
      userName: invite.email.split("@")[0],
      userEmail: invite.email,
    });
  },
} satisfies AuthService;
