import type { StdioMcpConfig } from './types.ts';

export function createBacklogMdConfig(): StdioMcpConfig {
  return {
    type: 'stdio' as const,
    command: 'npx',
    args: ['backlog-md'],
    enabled: true,
  };
}
