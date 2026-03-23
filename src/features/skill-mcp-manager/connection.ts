import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { log } from '../../shared/logger.ts';
import type { McpServerConfig } from '../../types/mcp.ts';
import type { SkillMcpClientConnectionParams } from './types.ts';

function createTransport(
  config: McpServerConfig
): StdioClientTransport | StreamableHTTPClientTransport {
  if (config.type === 'stdio') {
    if (!config.command) {
      throw new Error('MCP stdio config requires command');
    }
    return new StdioClientTransport({ command: config.command, args: config.args });
  }

  if (!config.url) {
    throw new Error('MCP remote config requires url');
  }

  return new StreamableHTTPClientTransport(new URL(config.url), {
    requestInit: { headers: config.headers },
  });
}

async function connectClient(config: McpServerConfig): Promise<Client> {
  const client: Client = new Client(
    { name: 'gstack-skill-mcp-manager', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = createTransport(config);
  await client.connect(transport);

  return client;
}

export async function getOrCreateClient(params: SkillMcpClientConnectionParams): Promise<Client> {
  const { state, clientKey, config } = params;

  const existingClient = state.clients.get(clientKey);
  if (existingClient) {
    return existingClient;
  }

  const pendingConnection = state.pendingConnections.get(clientKey);
  if (pendingConnection) {
    return await pendingConnection;
  }

  const connectPromise: Promise<Client> = connectClient(config)
    .then((client) => {
      state.clients.set(clientKey, client);
      return client;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      log('[ERROR] Failed to connect MCP client', { clientKey, message });
      throw error;
    })
    .finally(() => {
      state.pendingConnections.delete(clientKey);
    });

  state.pendingConnections.set(clientKey, connectPromise);
  return await connectPromise;
}

export async function getOrCreateClientWithRetryImpl(
  params: SkillMcpClientConnectionParams
): Promise<Client> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getOrCreateClient(params);
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) {
        break;
      }
      log('[ERROR] Retrying MCP client connection', {
        clientKey: params.clientKey,
        attempt,
        message: lastError.message,
      });
    }
  }

  throw lastError ?? new Error('Failed to create MCP client with unknown error');
}
