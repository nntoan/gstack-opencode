import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Resource, Tool } from '@modelcontextprotocol/sdk/types.js';
import { disconnectAll, disconnectSession, forceReconnect } from './cleanup.ts';
import { getOrCreateClient, getOrCreateClientWithRetryImpl } from './connection.ts';
import type { SkillMcpClientInfo, SkillMcpManagerState, SkillMcpServerContext } from './types.ts';

import type { McpServerConfig } from '../../types/mcp.ts';

export class SkillMcpManager {
  private readonly state: SkillMcpManagerState = {
    clients: new Map(),
    pendingConnections: new Map(),
    disconnectedSessions: new Map(),
    idleTimeoutMs: 5 * 60 * 1000,
    disposed: false,
  };

  private getClientKey(info: SkillMcpClientInfo): string {
    return `${info.sessionID}:${info.skillName}:${info.serverName}`;
  }

  async getOrCreateClient(info: SkillMcpClientInfo, config: McpServerConfig): Promise<Client> {
    const clientKey = this.getClientKey(info);
    return await getOrCreateClient({
      state: this.state,
      clientKey,
      info,
      config,
    });
  }

  async disconnectSession(sessionID: string): Promise<void> {
    await disconnectSession(this.state, sessionID);
  }

  async disconnectAll(): Promise<void> {
    await disconnectAll(this.state);
  }

  async listTools(info: SkillMcpClientInfo, context: SkillMcpServerContext): Promise<Tool[]> {
    return await this.withOperationRetry(info, context.config, async (client) => {
      const result = await client.listTools();
      return result.tools;
    });
  }

  async listResources(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext
  ): Promise<Resource[]> {
    return await this.withOperationRetry(info, context.config, async (client) => {
      const result = await client.listResources();
      return result.resources;
    });
  }

  async callTool(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext,
    name: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    return await this.withOperationRetry(info, context.config, async (client) => {
      const result = await client.callTool({ name, arguments: args });
      return result.content;
    });
  }

  async readResource(
    info: SkillMcpClientInfo,
    context: SkillMcpServerContext,
    uri: string
  ): Promise<unknown> {
    return await this.withOperationRetry(info, context.config, async (client) => {
      const result = await client.readResource({ uri });
      return result.contents;
    });
  }

  private async withOperationRetry<T>(
    info: SkillMcpClientInfo,
    config: McpServerConfig,
    operation: (client: Client) => Promise<T>
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = await this.getOrCreateClientWithRetry(info, config);
        return await operation(client);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (!lastError.message.toLowerCase().includes('not connected')) {
          throw lastError;
        }

        if (attempt === maxRetries) {
          throw new Error(`Failed after ${maxRetries} reconnection attempts: ${lastError.message}`);
        }

        await forceReconnect(this.state, this.getClientKey(info));
      }
    }

    throw lastError ?? new Error('Operation failed with unknown error');
  }

  private async getOrCreateClientWithRetry(
    info: SkillMcpClientInfo,
    config: McpServerConfig
  ): Promise<Client> {
    const clientKey = this.getClientKey(info);
    return await getOrCreateClientWithRetryImpl({
      state: this.state,
      clientKey,
      info,
      config,
    });
  }

  getConnectedServers(): string[] {
    return Array.from(this.state.clients.keys());
  }

  isConnected(info: SkillMcpClientInfo): boolean {
    return this.state.clients.has(this.getClientKey(info));
  }
}
