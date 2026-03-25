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

void members.create({
  id: "member-1",
  organizationId: "dummy-org-id",
  userId: "dummy-user-id",
  role: "owner",
  createdAt: new Date().toISOString(),
  userName: "Dummy User",
  userEmail: "dummy@user.com",
});
void members.create({
  id: "member-2",
  organizationId: "dummy-org-id",
  userId: "dummy-user-id-2",
  role: "member",
  createdAt: new Date().toISOString(),
  userName: "Jane Smith",
  userEmail: "jane@example.com",
});
void invitations.create({
  id: "invite-1",
  organizationId: "dummy-org-id",
  email: "pending@example.com",
  role: "member",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "pending",
});

export const authService = {
  ensureSignedIn() {
    if (shellStore.user?.organizationId) return Promise.resolve(true);
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
    return Promise.resolve(true);
  },

  generateApiKey(name, expiresInMs = DEFAULT_EXPIRATION_MS) {
    const now = new Date();
    return apiKeys.create({
      name,
      key: crypto.randomUUID(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresInMs),
    });
  },

  revokeApiKey(apiKeyId: string) {
    apiKeys.delete((q) => q.where({ id: apiKeyId }));
    return Promise.resolve();
  },

  listApiKeys() {
    return Promise.resolve(apiKeys.findMany());
  },

  signInWithOAuth() {
    globalThis.location.href = "/";
    return Promise.resolve();
  },

  sendMagicLinkEmail() {
    return Promise.resolve("dummy nonce");
  },

  signInWithMagicLink() {
    return Promise.reject(new Error("Magic Link not implemented"));
  },

  signInWithPassword() {
    globalThis.location.href = "/";
    return Promise.resolve();
  },

  signUpWithPassword() {
    globalThis.location.href = "/";
    return Promise.resolve();
  },

  signOut() {
    shellStore.user = undefined;
    shellStore.organizations = [];
    return Promise.resolve();
  },

  getOrganization() {
    const organizationId = shellStore.user?.organizationId;
    return Promise.resolve({
      members: members.findMany().flatMap((m) =>
        m.organizationId === organizationId
          ? [
              {
                id: m.id,
                userId: m.userId,
                role: m.role,
                createdAt: m.createdAt,
                user: { name: m.userName, email: m.userEmail },
              },
            ]
          : [],
      ),
      invitations: invitations.findMany().flatMap((i) =>
        i.organizationId === organizationId
          ? [
              {
                id: i.id,
                email: i.email,
                role: i.role,
                expiresAt: i.expiresAt,
                status: i.status,
              },
            ]
          : [],
      ),
    });
  },

  setActiveOrganization(orgId) {
    if (shellStore.user) shellStore.user.organizationId = orgId;
    globalThis.localStorage?.setItem("hebo:dummy-org-id", orgId);
    globalThis.location.replace("/");
    return Promise.resolve();
  },

  inviteMember(email, role, _teamId) {
    const organizationId = shellStore.user?.organizationId;
    if (!organizationId) return Promise.reject(new Error("No active organization"));
    void invitations.create({
      organizationId,
      email,
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    });
    return Promise.resolve();
  },

  removeMember(memberIdOrEmail) {
    members.delete((q) => q.where({ userEmail: memberIdOrEmail }));
    return Promise.resolve();
  },

  cancelInvitation(invitationId) {
    invitations.delete((q) => q.where({ id: invitationId }));
    return Promise.resolve();
  },

  acceptInvitation(invitationId) {
    const invite = invitations.findFirst((q) => q.where({ id: invitationId, status: "pending" }));
    if (!invite) return Promise.reject(new Error("Invitation not found or already accepted."));
    if (Date.parse(invite.expiresAt) <= Date.now()) {
      return Promise.reject(new Error("Invitation has expired."));
    }
    invitations.delete((q) => q.where({ id: invitationId }));
    const user = shellStore.user;
    void members.create({
      organizationId: invite.organizationId,
      userId: user?.userId ?? `accepted-${invitationId}`,
      role: invite.role,
      createdAt: new Date().toISOString(),
      userName: user?.name ?? invite.email.split("@")[0],
      userEmail: user?.email ?? invite.email,
    });
    return Promise.resolve();
  },
} satisfies AuthService;
