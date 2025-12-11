import { createAuthClient } from "better-auth/client";
import { apiKeyClient, emailOTPClient } from "better-auth/client/plugins";

import { apiUrl } from "~console/lib/service";
import { shellStore } from "~console/lib/shell";

import {
  DEFAULT_EXPIRATION_SECONDS,
  type ApiKey,
  type AuthService,
  type User,
} from "./types";

const baseURL = new URL("auth", apiUrl).toString();
const appRedirectURL = `${globalThis.location.origin}/`;

const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient(), apiKeyClient()],
});

export const authService: AuthService = {
  async ensureSignedIn() {
    const session = await authClient.getSession();
    const user = session.data?.user as User | undefined;

    if (!user) {
      globalThis.location.replace("/signin");
      return;
    }

    shellStore.user = user;
  },

  async generateApiKey(name, expiresIn = DEFAULT_EXPIRATION_SECONDS) {
    const { data } = await authClient.apiKey.create({ name, expiresIn });
    return data as ApiKey;
  },

  async revokeApiKey(apiKeyId) {
    await authClient.apiKey.delete({ keyId: apiKeyId });
  },

  async listApiKeys() {
    const { data = [] } = await authClient.apiKey.list();
    return data!.map((key) => ({
      ...key,
      value: `${key.start}******`,
    })) as ApiKey[];
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
      // FUTURE: enable this when this github issue will be solved: https://github.com/better-auth/better-auth/issues/5596
      // callbackURL: appRedirectURL,
    });
    globalThis.location.replace(appRedirectURL);
  },
};

export { authClient };
