import { Collection } from "@msw/data";
import { z } from "zod";

import { shellStore } from "~console/lib/shell";

import { DEFAULT_EXPIRATION_MS, type AuthService } from "./types";

const apiKeys = new Collection({
  schema: z.object({
    id: z.string().default(crypto.randomUUID()),
    name: z.string(),
    key: z.string(),
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
      image: "",
    };
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
  },
} satisfies AuthService;
