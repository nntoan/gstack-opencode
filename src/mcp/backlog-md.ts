import type { LocalMcpConfig } from './types.ts';

export function createBacklogMdConfig(): LocalMcpConfig {
  return {
    type: 'local' as const,
    command: ['npx', '-y', 'backlog', 'mcp', 'start'],
    enabled: true,
  };
}
