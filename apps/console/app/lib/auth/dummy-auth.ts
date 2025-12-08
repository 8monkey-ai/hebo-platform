import { Collection } from "@msw/data";
import { z } from "zod";

import { shellStore } from "~console/lib/shell";

import { DEFAULT_EXPIRATION_MS, type AuthService } from "./types";

const apiKeys = new Collection({
  schema: z.object({
    id: z.string().default(crypto.randomUUID()),
    description: z.string(),
    value: z.string(),
    createdAt: z.date(),
    expiresAt: z.date(),
  }),
});

export const authService = {
  async ensureSignedIn() {
    if (shellStore.user) return;
    shellStore.user = {
      name: "Dummy User",
      email: "dummy@user.com",
      initials: "DU",
      avatar: "",
    };
  },

  getAccessToken() {
    return "dummy-access-token";
  },

  async generateApiKey(description, expiresIn = DEFAULT_EXPIRATION_MS) {
    const now = new Date();
    const newKey = await apiKeys.create({
      description,
      value: crypto.randomUUID(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresIn),
    });

    return newKey;
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
} satisfies AuthService;
