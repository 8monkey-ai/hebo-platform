export interface AuthService {
  ensureSignedIn(): Promise<void>;
  generateApiKey(name: string, expiresInMs?: number): Promise<ApiKey>;
  revokeApiKey(apiKeyId: string): Promise<void>;
  listApiKeys(): Promise<Array<ApiKey>>;
  signInWithOAuth(provider: string): Promise<void>;
  sendMagicLinkEmail(email: string): Promise<string>;
  signInWithMagicLink(code: string, email: string): Promise<void>;
  signOut(): Promise<void>;
}

export const DEFAULT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type User = {
  email: string;
  name: string;
  initials?: string;
  image?: string;
};

export type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  expiresAt: Date;
};
