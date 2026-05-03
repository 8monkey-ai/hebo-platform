export type ApiKeyWorkspaceRef = { workspaceSlug: string; workspaceId?: string };

export interface AuthService {
  ensureSignedIn(): Promise<boolean>;
  generateApiKey(
    name: string,
    expiresInMs?: number,
    workspace?: ApiKeyWorkspaceRef,
  ): Promise<ApiKey>;
  revokeApiKey(apiKeyId: string): Promise<void>;
  listApiKeys(options?: { workspaceSlug?: string }): Promise<Array<ApiKey>>;
  signInWithOAuth(provider: string): Promise<void>;
  sendMagicLinkEmail(email: string): Promise<string>;
  signInWithMagicLink(code: string, email: string): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(name: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  // Organization
  getOrganization(): Promise<{ members: OrgMember[]; invitations: OrgInvitation[] }>;
  setActiveOrganization(orgId: string): Promise<void>;
  inviteMember(email: string, role: string, teamId?: string): Promise<void>;
  removeMember(memberIdOrEmail: string): Promise<void>;
  cancelInvitation(invitationId: string): Promise<void>;
  acceptInvitation(invitationId: string): Promise<void>;
}

export const DEFAULT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type User = {
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  initials?: string;
  image?: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type OrgMember = {
  id: string;
  userId: string;
  role: string;
  createdAt: Date;
  user: { name: string; email: string };
};

export type OrgInvitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  status: string;
  teamId?: string;
};

export type ApiKey = {
  id: string;
  name: string | null;
  key: string;
  createdAt: Date;
  expiresAt: Date | null;
};
