import { apiKeyClient } from "@better-auth/api-key/client";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { getSessionCookie } from "better-auth/cookies";

import { authUrl } from "~console/lib/env";
import { shellStore } from "~console/lib/shell";

import {
  DEFAULT_EXPIRATION_MS,
  type ApiKey,
  type AuthService,
  type OrgInvitation,
  type OrgMember,
  type User,
} from "./types";

const appRedirectPath = "/?after-signin";
const appRedirectURL = `${globalThis.location.origin}${appRedirectPath}`;

const authClient = createAuthClient({
  baseURL: new URL("/v1", authUrl).toString(),
  plugins: [
    emailOTPClient(),
    apiKeyClient(),
    organizationClient({
      teams: { enabled: true },
      schema: {
        team: {
          additionalFields: {
            workspaceSlug: {
              type: "string",
            },
          },
        },
      },
    }),
  ],
});

const redirectToSignIn = (): false => {
  shellStore.user = undefined;
  globalThis.location.replace("/signin");
  return false;
};

export const authService: AuthService = {
  async ensureSignedIn() {
    const headers = new Headers({ cookie: document.cookie });
    if (!getSessionCookie(headers)) {
      return redirectToSignIn();
    }

    const hasSessionDataCookie = getSessionCookie(headers, {
      cookieName: "session_data",
    });

    if (shellStore.user?.organizationId && hasSessionDataCookie) {
      return true;
    }

    // Disable cookie cache only after fresh sign-in to ensure we get the latest session
    const isComingFromSignIn = new URL(globalThis.location.href).searchParams.has("after-signin");

    const session = await authClient.getSession({
      query: { disableCookieCache: isComingFromSignIn },
    });
    if (!session?.data?.user) {
      return redirectToSignIn();
    }

    const user: User = {
      name: session.data.user.name,
      email: session.data.user.email,
      userId: session.data.user.id,
      organizationId: session.data.session.activeOrganizationId!,
      image: session.data.user.image ?? undefined,
    };

    user.initials = (user?.name ?? user.email)
      .split(user?.name ? " " : "@")
      .map((p) => p[0])
      .join("");

    const orgsResult = await authClient.organization.list();
    shellStore.organizations = (orgsResult.data ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
    }));

    shellStore.user = user;

    // Resume pending invitation acceptance after sign-in redirect
    const pendingInvitation = sessionStorage.getItem("hebo:pending-invitation");
    if (pendingInvitation) {
      sessionStorage.removeItem("hebo:pending-invitation");
      globalThis.location.replace(`/accept-invitation?id=${encodeURIComponent(pendingInvitation)}`);
      return false;
    }

    return true;
  },

  async generateApiKey(name, expiresInMs = DEFAULT_EXPIRATION_MS, workspace) {
    // Better Auth expects seconds.
    const expiresIn = Math.max(1, Math.floor(expiresInMs / 1000));
    const { data, error } = await authClient.apiKey.create({
      name,
      expiresIn,
      organizationId: shellStore.user?.organizationId,
      metadata: {
        createdByUserId: shellStore.user?.userId,
        ...(workspace?.workspaceSlug && { workspaceSlug: workspace.workspaceSlug }),
        ...(workspace?.workspaceId && { workspaceId: workspace.workspaceId }),
      },
    });
    if (error) throw new Error(error.message);
    return data satisfies ApiKey;
  },

  async revokeApiKey(apiKeyId) {
    const { error } = await authClient.apiKey.delete({
      keyId: apiKeyId,
    });
    if (error) throw new Error(error.message);
  },

  async listApiKeys(options) {
    const { data, error } = await authClient.apiKey.list({
      query: {
        organizationId: shellStore.user?.organizationId,
      },
    });
    if (error) throw new Error(error.message);
    const filtered = options?.workspaceSlug
      ? data.apiKeys.filter((k) => {
          const metadata = k.metadata as { workspaceSlug?: string } | null | undefined;
          return metadata?.workspaceSlug === options.workspaceSlug;
        })
      : data.apiKeys;
    const keys: ApiKey[] = filtered.map((k) => ({
      id: k.id,
      name: k.name ?? "",
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      key: `${k.start}******`,
    }));
    return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async signInWithOAuth(provider: string) {
    await authClient.signIn.social({
      provider,
      callbackURL: appRedirectURL,
    });
  },

  async sendMagicLinkEmail(email: string) {
    await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    return "otp-sent";
  },

  async signInWithMagicLink(code: string, email: string) {
    const token = code?.trim();
    const emailValue = email?.trim();
    if (!token) throw new Error("Missing code");
    if (!emailValue) throw new Error("Missing email");

    await authClient.signIn.emailOtp({
      email: emailValue,
      otp: token,
    });

    // FUTURE: Replace this manual redirect once Better Auth supports callbackURL/redirect for email OTP sign-in.
    // Tracking: https://github.com/better-auth/better-auth/issues/5596
    globalThis.location.replace(appRedirectPath);
  },

  async signInWithPassword(email: string, password: string) {
    const { error } = await authClient.signIn.email({
      email,
      password,
      callbackURL: appRedirectPath,
    });
    if (error) throw new Error(error.message ?? "Invalid credentials");
    globalThis.location.replace(appRedirectPath);
  },

  async signUpWithPassword(name: string, email: string, password: string) {
    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: appRedirectPath,
    });
    if (error) throw new Error(error.message ?? "Sign-up failed");
    globalThis.location.replace(appRedirectPath);
  },

  async signOut() {
    await authClient.signOut();
    shellStore.user = undefined;
    shellStore.organizations = [];
  },

  async getOrganization() {
    const { data, error } = await authClient.organization.getFullOrganization();
    if (error) throw new Error(error.message);
    if (!data) return { members: [], invitations: [] };

    const seen = new Set<string>();
    const members = (data.members satisfies OrgMember[]).filter(({ userId }) => {
      if (seen.has(userId)) return false;
      seen.add(userId);
      return true;
    });

    const invitations = ((data.invitations ?? []) satisfies OrgInvitation[]).filter(
      (i) => i.status === "pending",
    );

    return { members, invitations };
  },

  async setActiveOrganization(orgId) {
    const { error } = await authClient.organization.setActive({ organizationId: orgId });
    if (error) throw new Error(error.message);
    // Refresh the session_data cookie cache so subsequent API requests use the new org.
    await authClient.getSession({ query: { disableCookieCache: true } });
    globalThis.location.replace("/");
  },

  async inviteMember(email, role: "member" | "admin" | "owner", teamId) {
    const { error } = await authClient.organization.inviteMember({
      email,
      role,
      resend: true,
      ...(teamId && { teamId }),
    });
    if (error) throw new Error(error.message);
  },

  async removeMember(memberIdOrEmail) {
    const { error } = await authClient.organization.removeMember({ memberIdOrEmail });
    if (error) throw new Error(error.message);
  },

  async cancelInvitation(invitationId) {
    const { error } = await authClient.organization.cancelInvitation({ invitationId });
    if (error) throw new Error(error.message);
  },

  async acceptInvitation(invitationId: string) {
    const KEY = "hebo:pending-invitation";

    const { error } = await authClient.organization.acceptInvitation({ invitationId });

    if (error?.status === 401) {
      if (sessionStorage.getItem(KEY) === invitationId) {
        sessionStorage.removeItem(KEY);
        throw new Error("Please sign in and try the invitation link again.");
      }

      sessionStorage.setItem(KEY, invitationId);
      location.replace("/signin");
      throw new Error("Redirecting to sign in…");
    }

    sessionStorage.removeItem(KEY);

    if (error) {
      throw new Error(error.message ?? "Failed to accept invitation.");
    }
  },
};
