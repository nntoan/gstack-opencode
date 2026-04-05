import { createWebsearchConfig } from './websearch.ts';
import { createContext7Config } from './context7.ts';
import { grep_app } from './grep-app.ts';
import { createContexthubConfig } from './contexthub.ts';
import { createBacklogMdConfig } from './backlog-md.ts';
import type { GstackConfig } from '../types/config.ts';
import type { LocalMcpConfig, RemoteMcpConfig, StdioMcpConfig } from './types.ts';

export { McpNameSchema, type McpName } from './types.ts';

type McpServerConfig = RemoteMcpConfig | StdioMcpConfig | LocalMcpConfig;

export function createBuiltinMcps(
  disabledMcps: string[] = [],
  config?: GstackConfig
): Record<string, McpServerConfig> {
  const mcps: Record<string, McpServerConfig> = {};

  if (!disabledMcps.includes('websearch')) {
    mcps.websearch = createWebsearchConfig(config?.mcp?.websearch);
  }

  if (!disabledMcps.includes('context7')) {
    mcps.context7 = createContext7Config(config?.mcp?.context7);
  }

  if (!disabledMcps.includes('grep_app')) {
    mcps.grep_app = grep_app;
  }

  if (!disabledMcps.includes('contexthub')) {
    mcps.contexthub = createContexthubConfig();
  }

  if (!disabledMcps.includes('backlog_md')) {
    mcps.backlog_md = createBacklogMdConfig();
  }

  return mcps;
}
