import type { LocalMcpConfig } from './types.ts';

export function createContexthubConfig(): LocalMcpConfig {
  return {
    type: 'local' as const,
    command: ['npx', '-y', '@aisuite/chub'],
    enabled: true,
  };
}
