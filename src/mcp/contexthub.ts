import type { StdioMcpConfig } from './types.ts';

export function createContexthubConfig(): StdioMcpConfig {
  return {
    type: 'stdio' as const,
    command: 'npx',
    args: ['contexthub'],
    enabled: true,
  };
}
