import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { McpServerConfig } from '../../types/mcp.ts';

export interface SkillMcpClientInfo {
  serverName: string;
  skillName: string;
  sessionID: string;
}

export interface SkillMcpServerContext {
  config: McpServerConfig;
  skillName: string;
}

export interface ManagedClient {
  client: Client;
  skillName: string;
  lastUsedAt: number;
  connectionType: 'local' | 'stdio' | 'remote';
}

export interface SkillMcpManagerState {
  clients: Map<string, Client>;
  pendingConnections: Map<string, Promise<Client>>;
  disconnectedSessions: Map<string, number>;
  idleTimeoutMs: number;
  disposed: boolean;
}

export interface SkillMcpClientConnectionParams {
  state: SkillMcpManagerState;
  clientKey: string;
  info: SkillMcpClientInfo;
  config: McpServerConfig;
}

export interface McpToolInvoker {
  invoke(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
}
