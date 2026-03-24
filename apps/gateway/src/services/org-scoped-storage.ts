import { AsyncLocalStorage } from "node:async_hooks";

import type {
  ConversationEntity,
  ConversationItemEntity,
  ConversationItemInput,
  ConversationMetadata,
  ConversationQueryOptions,
  ConversationStorage,
} from "@hebo-ai/gateway/endpoints/conversations";

export const orgContext = new AsyncLocalStorage<string>();

/**
 * Wraps a ConversationStorage to enforce multi-tenant isolation via `organization_id` metadata.
 *
 * - create: injects organization_id into metadata
 * - list: filters by organization_id
 * - get/update/delete: verifies ownership before proceeding
 */
export class OrgScopedStorage implements ConversationStorage {
  constructor(private storage: ConversationStorage) {}

  private getOrgId(): string {
    const orgId = orgContext.getStore();
    if (!orgId) throw new Error("Missing organization context");
    return orgId;
  }

  createConversation(params: {
    metadata?: ConversationMetadata;
    items?: ConversationItemInput[];
  }): Promise<ConversationEntity> {
    return this.storage.createConversation({
      ...params,
      metadata: { ...params.metadata, organization_id: this.getOrgId() },
    });
  }

  async getConversation(id: string): Promise<ConversationEntity | undefined> {
    const conv = await this.storage.getConversation(id);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) return undefined;
    return conv;
  }

  listConversations(params: ConversationQueryOptions): Promise<ConversationEntity[]> {
    return this.storage.listConversations({
      ...params,
      metadata: { ...params.metadata, organization_id: this.getOrgId() },
    });
  }

  async updateConversation(
    id: string,
    metadata: ConversationMetadata,
  ): Promise<ConversationEntity | undefined> {
    const conv = await this.storage.getConversation(id);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) return undefined;
    return this.storage.updateConversation(id, {
      ...metadata,
      organization_id: this.getOrgId(),
    });
  }

  async deleteConversation(id: string): Promise<{ id: string; deleted: boolean }> {
    const conv = await this.storage.getConversation(id);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) {
      return { id, deleted: false };
    }
    return this.storage.deleteConversation(id);
  }

  async addItems(
    conversationId: string,
    items: ConversationItemInput[],
  ): Promise<ConversationItemEntity[] | undefined> {
    const conv = await this.storage.getConversation(conversationId);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) return undefined;
    return this.storage.addItems(conversationId, items);
  }

  async getItem(
    conversationId: string,
    itemId: string,
  ): Promise<ConversationItemEntity | undefined> {
    const conv = await this.storage.getConversation(conversationId);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) return undefined;
    return this.storage.getItem(conversationId, itemId);
  }

  async deleteItem(
    conversationId: string,
    itemId: string,
  ): Promise<ConversationEntity | undefined> {
    const conv = await this.storage.getConversation(conversationId);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) return undefined;
    return this.storage.deleteItem(conversationId, itemId);
  }

  async listItems(
    conversationId: string,
    params: ConversationQueryOptions,
  ): Promise<ConversationItemEntity[] | undefined> {
    const conv = await this.storage.getConversation(conversationId);
    if (!conv || conv.metadata?.organization_id !== this.getOrgId()) return undefined;
    return this.storage.listItems(conversationId, params);
  }
}
