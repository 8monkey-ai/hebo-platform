import { createAuthClient } from "better-auth/client";
import { apiKeyClient, emailOTPClient } from "better-auth/client/plugins";

import { isDevLocal } from "~console/lib/env";
import { shellStore } from "~console/lib/shell";

import type { ApiKey, AuthService, User } from "./types";

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
  plugins: [emailOTPClient(), apiKeyClient()],
});

const {
  emailOtp: emailOtpApi,
  apiKey: apiKeyApi,
  signIn: signInApi,
} = authClient;
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

const unwrapData = <T>(value: unknown): T => {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data: T }).data;
  }
  return value as T;
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

  async generateApiKey(description, expiresIn?: number) {
    const create = apiKeyApi?.create;
    if (!create) throw new Error("API key client not available");

    const payload = {
      name: description,
      ...(typeof expiresIn === "number" ? { expiresIn } : {}),
    };

    try {
      const result = await create(payload);
      return unwrapData<ApiKey>(result);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to create API key",
      );
    }
  },

  async revokeApiKey(apiKeyId) {
    const remove = apiKeyApi?.delete;
    if (!remove) throw new Error("API key client not available");

    try {
      await remove({ keyId: apiKeyId });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to revoke API key",
      );
    }
  },

  async listApiKeys() {
    const list = apiKeyApi?.list;
    if (!list) throw new Error("API key client not available");

    try {
      const result = await list();
      const unwrapped = unwrapData<unknown>(result);
      return Array.isArray(unwrapped) ? (unwrapped as ApiKey[]) : [];
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Unable to load API keys",
      );
    }
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

    const signInEmailOtp = signInApi?.emailOtp;

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
