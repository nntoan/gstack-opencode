import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { log } from '../../shared/logger.ts';
import type { SkillMcpManagerState } from './types.ts';

async function closeClient(client: Client, clientKey: string): Promise<void> {
  try {
    await client.close();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log('[ERROR] Failed to close MCP client', { clientKey, message });
  }
}

export async function disconnectSession(
  state: SkillMcpManagerState,
  sessionID: string
): Promise<void> {
  const sessionPrefix = `${sessionID}:`;
  const keysToDisconnect = Array.from(state.clients.keys()).filter((key) =>
    key.startsWith(sessionPrefix)
  );

  for (const clientKey of keysToDisconnect) {
    const client = state.clients.get(clientKey);
    if (!client) {
      continue;
    }
    await closeClient(client, clientKey);
    state.clients.delete(clientKey);
    state.pendingConnections.delete(clientKey);
  }

  state.disconnectedSessions.set(sessionID, Date.now());
}

export async function disconnectAll(state: SkillMcpManagerState): Promise<void> {
  const clientEntries = Array.from(state.clients.entries());
  for (const [clientKey, client] of clientEntries) {
    await closeClient(client, clientKey);
  }

  state.clients.clear();
  state.pendingConnections.clear();
  state.disconnectedSessions.clear();
}

export async function forceReconnect(
  state: SkillMcpManagerState,
  clientKey: string
): Promise<void> {
  const client = state.clients.get(clientKey);
  if (client) {
    await closeClient(client, clientKey);
  }

  state.clients.delete(clientKey);
  state.pendingConnections.delete(clientKey);
}
