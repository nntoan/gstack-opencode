import type { RemoteMcpConfig } from './types.ts';

export const grep_app: RemoteMcpConfig = {
  type: 'remote' as const,
  url: 'https://mcp.grep.app',
  enabled: true,
  oauth: false as const,
};
