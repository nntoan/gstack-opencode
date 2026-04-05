import type { Context7McpOverride } from '../types/config.ts';
import type { RemoteMcpConfig } from './types.ts';

export function createContext7Config(config?: Context7McpOverride): RemoteMcpConfig {
  const apiKey = process.env.CONTEXT7_API_KEY ?? config?.api_key;
  return {
    type: 'remote' as const,
    url: 'https://mcp.context7.com/mcp',
    enabled: true,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    oauth: false as const,
  };
}
