import type { WebsearchMcpConfig } from '../config/schema/mcp-schema.ts';
import type { RemoteMcpConfig } from './types.ts';

export function createWebsearchConfig(config?: WebsearchMcpConfig): RemoteMcpConfig {
  const provider = config?.provider ?? 'exa';

  if (provider === 'tavily') {
    const tavilyKey = process.env.TAVILY_API_KEY;
    return {
      type: 'remote' as const,
      url: 'https://mcp.tavily.com/mcp/',
      enabled: true,
      headers: tavilyKey ? { Authorization: `Bearer ${tavilyKey}` } : undefined,
      oauth: false as const,
    };
  }

  const exaKey = process.env.EXA_API_KEY ?? config?.api_key;
  return {
    type: 'remote' as const,
    url: exaKey
      ? `https://mcp.exa.ai/mcp?tools=web_search_exa&exaApiKey=${encodeURIComponent(exaKey)}`
      : 'https://mcp.exa.ai/mcp?tools=web_search_exa',
    enabled: true,
    ...(exaKey ? { headers: { 'x-api-key': exaKey } } : {}),
    oauth: false as const,
  };
}
