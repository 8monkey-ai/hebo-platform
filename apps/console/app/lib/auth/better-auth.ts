import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

import { isDevLocal } from "~console/lib/env";
import { shellStore } from "~console/lib/shell";

import type { AuthService, User } from "./types";

// TODO: make sure pure FE experience (no auth involved) still works
const authHost =
  import.meta.env.VITE_AUTH_BASE_URL ??
  import.meta.env.VITE_API_URL ??
  (isDevLocal ? "http://localhost:3001" : undefined) ??
  "http://localhost:3001";

const baseURL = `${authHost.replace(/\/?$/, "")}/auth`;

const appOrigin =
  (globalThis.window !== undefined && globalThis.location.origin) ||
  import.meta.env.VITE_APP_BASE_URL ||
  "http://localhost:5173";
const appRedirectURL = `${appOrigin.replace(/\/?$/, "")}/`;

const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient()],
});

type EmailOtpClient = {
  sendVerificationOtp(args: {
    email: string;
    type: "sign-in";
  }): Promise<unknown>;
};

// The client plugin typing is broad; cast to the minimal shape we use.
const emailOtpApi = (authClient as unknown as { emailOtp?: EmailOtpClient })
  .emailOtp;
let lastEmail: string | undefined;

export const setOtpEmail = (email: string | undefined) => {
  lastEmail = email?.trim() || undefined;
};

const getInitials = (name?: string, email?: string) => {
  const source = name?.trim() || email?.trim();
  if (!source) return;

  const [first = "", second = ""] = source.split(/\s+/).filter(Boolean);
  if (first && second) return `${first[0]}${second[0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const mapUser = (data: Partial<User> & { email?: string; name?: string }) => {
  const user: User = {
    email: data.email ?? "",
    name: data.name ?? data.email ?? "",
    avatar: (data as { image?: string }).image ?? data.avatar,
    initials: data.initials ?? getInitials(data.name, data.email),
  };
  return user;
};

export const authService: AuthService = {
  async ensureSignedIn() {
    const session = await authClient.getSession();
    const user = session?.data?.user;

    if (!user) {
      if (globalThis.window !== undefined)
        globalThis.location.replace("/signin");
      return;
    }

    shellStore.user = mapUser(user);
  },

  getAccessToken() {
    // Better Auth is cookie-based in the console; add bearer once available.
    return;
  },

  async generateApiKey() {
    throw new Error("Not implemented");
  },

  async revokeApiKey() {
    throw new Error("Not implemented");
  },

  async listApiKeys() {
    throw new Error("Not implemented");
  },

  async signInWithOAuth(provider: string) {
    await authClient.signIn.social({
      provider,
      callbackURL: appRedirectURL,
    });
  },

  async sendMagicLinkEmail(email: string) {
    if (!emailOtpApi?.sendVerificationOtp) {
      throw new Error("Email OTP client not available");
    }
    setOtpEmail(email);
    await emailOtpApi.sendVerificationOtp({
      email,
      type: "sign-in",
    });

    // OTP-only flow; return a truthy value to move UI forward.
    return "otp-sent";
  },

  async signInWithMagicLink(code: string) {
    const token = code?.trim();
    if (!token) throw new Error("Missing code");

    const signInEmailOtp = (
      authClient as unknown as {
        signIn: {
          emailOtp(args: { email: string; otp: string }): Promise<{
            data?: { user?: Partial<User> };
          }>;
        };
      }
    ).signIn?.emailOtp;

    if (!signInEmailOtp) throw new Error("Email OTP client not available");
    if (!lastEmail) throw new Error("Email required before verifying OTP");

    const session = await signInEmailOtp({
      email: lastEmail,
      otp: token,
    });
    const user = session?.data?.user;
    if (user) {
      shellStore.user = mapUser(user);
      if (globalThis.window !== undefined)
        globalThis.location.replace(appRedirectURL);
    }
  },
};

export { authClient };
