import { createAuthClient } from "better-auth/client";
import {
  apiKeyClient,
  emailOTPClient,
  organizationClient,
} from "better-auth/client/plugins";
import { getSessionCookie } from "better-auth/cookies";

import { authUrl } from "~console/lib/service";
import { shellStore } from "~console/lib/shell";

import {
  DEFAULT_EXPIRATION_MS,
  type ApiKey,
  type AuthService,
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
            agentSlug: {
              type: "string",
            },
          },
        },
      },
    }),
  ],
});

export const authService: AuthService = {
  async ensureSignedIn() {
    const headers = new Headers();
    headers.set("cookie", document.cookie);
    if (!getSessionCookie(headers)) {
      shellStore.user = undefined;
      globalThis.location.replace("/signin");
      return;
    }

    if (shellStore.user) {
      return;
    }

    // Disable cookie cache only after fresh sign-in to ensure we get the latest session
    const url = new URL(globalThis.location.href);
    const isComingFromSignIn = url.searchParams.has("after-signin");
    if (isComingFromSignIn) {
      url.searchParams.delete("after-signin");
      globalThis.history.replaceState({}, "", url.pathname + url.search);
    }

    const session = await authClient.getSession({
      query: { disableCookieCache: isComingFromSignIn },
    });
    const user = session.data?.user as User;
    const initialsSource = user?.name || user.email;
    const initialsSeparator = user?.name ? " " : "@";
    user.initials = initialsSource
      .split(initialsSeparator)
      .map((part) => part[0])
      .join("");

    shellStore.user = user;
  },

  async generateApiKey(name, expiresInMs = DEFAULT_EXPIRATION_MS) {
    // Better Auth expects seconds.
    const expiresIn = Math.max(1, Math.floor(expiresInMs / 1000));
    const { data, error } = await authClient.apiKey.create({ name, expiresIn });
    if (error) throw new Error(error.message);
    return data as ApiKey;
  },

  async revokeApiKey(apiKeyId) {
    const { error } = await authClient.apiKey.delete({ keyId: apiKeyId });
    if (error) throw new Error(error.message);
  },

  async listApiKeys() {
    const { data, error } = await authClient.apiKey.list();
    if (error) throw new Error(error.message);
    const keys = data.map((key) => ({
      ...key,
      key: `${key.start}******`,
    })) as ApiKey[];
    return keys.toSorted(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
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

  async signOut() {
    await authClient.signOut();
    shellStore.user = undefined;
  },
};
