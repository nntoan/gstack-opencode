export interface McpServerConfig {
  type: 'remote' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  enabled: boolean;
  headers?: Record<string, string>;
  oauth?: false;
}

export type McpName = 'websearch' | 'context7' | 'contexthub' | 'grep_app' | 'backlog_md';

export type McpTier = 'builtin' | 'user' | 'skill-embedded';
