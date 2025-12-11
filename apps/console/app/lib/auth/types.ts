export interface AuthService {
  ensureSignedIn(): Promise<void>;
  generateApiKey(description: string, expiresIn?: number): Promise<ApiKey>;
  revokeApiKey(apiKeyId: string): Promise<void>;
  listApiKeys(): Promise<Array<ApiKey>>;
  signInWithOAuth(provider: string): Promise<void>;
  sendMagicLinkEmail(email: string): Promise<string>;
  signInWithMagicLink(code: string): Promise<void>;
}

export const DEFAULT_EXPIRATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type User = {
  email: string;
  name: string;
  initials?: string;
  avatar?: string;
};

export type ApiKey = {
  id: string;
  name?: string;
  key?: string;
  start?: string | null;
  createdAt: string | Date;
  expiresAt?: string | Date | null;
  description?: string;
};
