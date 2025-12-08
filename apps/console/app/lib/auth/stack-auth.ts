import { StackClientApp } from "@stackframe/react";
import { useNavigate } from "react-router";

import { shellStore } from "~console/lib/shell";
import { getCookie } from "~console/lib/utils";

import { DEFAULT_EXPIRATION_MS, type AuthService } from "./types";

let _stackApp: StackClientApp<true, string> | undefined;

const getStackApp = (): StackClientApp<true, string> => {
  if (!_stackApp) {
    _stackApp = new StackClientApp({
      projectId: import.meta.env.VITE_STACK_PROJECT_ID!,
      publishableClientKey: import.meta.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY!,
      tokenStore: "cookie",
      urls: {
        signIn: "/signin",
        signUp: "/signin",
        home: "/",
      },
      redirectMethod: {
        useNavigate,
      },
    });
  }

  return _stackApp;
};

const authService = {
  async ensureSignedIn() {
    const user = await getStackApp().getUser({ or: "redirect" });

    if (!user) return;
    shellStore.user = {
      email: user.primaryEmail ?? "",
      name: user.displayName ?? "",
      avatar: user.profileImageUrl ?? "",
    };
  },

  getAccessToken() {
    return JSON.parse(decodeURIComponent(getCookie("stack-access")!))[1];
  },

  async generateApiKey(description, expiresIn = DEFAULT_EXPIRATION_MS) {
    const user = await getStackApp().getUser();

    const apiKey = await user!.createApiKey({
      description,
      expiresAt: new Date(Date.now() + expiresIn),
      isPublic: false,
    });

    return {
      ...apiKey,
      expiresAt: apiKey.expiresAt!,
    };
  },

  async revokeApiKey(apiKeyId: string) {
    const user = await getStackApp().getUser();

    const apiKeys = await user!.listApiKeys();
    const apiKeyToRevoke = apiKeys.find((key) => key.id === apiKeyId);

    await apiKeyToRevoke!.revoke();
  },

  async listApiKeys() {
    const user = await getStackApp().getUser();

    const keys = await user!.listApiKeys();

    return keys.map((key) => ({
      ...key,
      value: `********${key.value.lastFour}`,
      expiresAt: key.expiresAt!,
    }));
  },

  async signInWithOAuth(provider: string) {
    await getStackApp().signInWithOAuth(provider);
  },

  async sendMagicLinkEmail(email: string) {
    const response = await getStackApp().sendMagicLinkEmail(email);
    if (response.status === "ok") return response.data.nonce;
    throw new Error(response.error.message);
  },

  async signInWithMagicLink(code: string) {
    const result = await getStackApp().signInWithMagicLink(code);
    if (result.status === "error") throw new Error("Invalid OTP");
  },
} satisfies AuthService;

export { authService, getStackApp };
