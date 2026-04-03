export interface McpServerConfig {
  type: 'remote' | 'stdio' | 'local';
  url?: string;
  command?: string | string[];
  args?: string[];
  enabled: boolean;
  headers?: Record<string, string>;
  oauth?: false;
  env?: Record<string, string>;
  environment?: Record<string, string>;
  timeout?: number;
}

export type McpName = 'websearch' | 'context7' | 'contexthub' | 'grep_app' | 'backlog_md';

export type McpTier = 'builtin' | 'user' | 'skill-embedded';
