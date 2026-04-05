import { describe, it, expect } from 'vitest';
import { applyMcpConfig } from './mcp-config-handler.ts';
import type { GstackConfig } from '../types/config.ts';

function makePluginConfig(overrides: Partial<GstackConfig> = {}): GstackConfig {
  return {
    orchestration_mode: 'multi-agent',
    disabled_skills: [],
    disabled_agents: [],
    disabled_categories: [],
    disabled_mcps: [],
    disabled_hooks: [],
    backlog: { enabled: true, auto_create_tasks: true, auto_update_status: true },
    ...overrides,
  };
}

describe('applyMcpConfig', () => {
  it('merges all 5 built-in MCPs into config when nothing disabled', async () => {
    const config: Record<string, unknown> = {};
    await applyMcpConfig({ config, pluginConfig: makePluginConfig() });
    const mcp = config.mcp as Record<string, unknown>;
    expect(Object.keys(mcp).sort()).toEqual([
      'backlog_md',
      'context7',
      'contexthub',
      'grep_app',
      'websearch',
    ]);
  });

  it('removes disabled MCPs from final config', async () => {
    const config: Record<string, unknown> = {};
    await applyMcpConfig({
      config,
      pluginConfig: makePluginConfig({ disabled_mcps: ['websearch', 'contexthub'] }),
    });
    const mcp = config.mcp as Record<string, unknown>;
    expect('websearch' in mcp).toBe(false);
    expect('contexthub' in mcp).toBe(false);
    expect(Object.keys(mcp).sort()).toEqual(['backlog_md', 'context7', 'grep_app']);
  });

  it('user MCPs override built-in configs', async () => {
    const config: Record<string, unknown> = {
      mcp: {
        websearch: { type: 'remote', url: 'https://custom.example.com', enabled: true },
      },
    };
    await applyMcpConfig({ config, pluginConfig: makePluginConfig() });
    const mcp = config.mcp as Record<string, unknown>;
    const ws = mcp.websearch as Record<string, unknown>;
    expect(ws.url).toBe('https://custom.example.com');
  });

  it('preserves user-added MCPs not in built-in list', async () => {
    const config: Record<string, unknown> = {
      mcp: {
        custom_mcp: { type: 'remote', url: 'https://custom.example.com', enabled: true },
      },
    };
    await applyMcpConfig({ config, pluginConfig: makePluginConfig() });
    const mcp = config.mcp as Record<string, unknown>;
    expect('custom_mcp' in mcp).toBe(true);
  });

  it('soft-disables MCPs via enabled:false in user config (marks enabled=false, does not remove)', async () => {
    const config: Record<string, unknown> = {
      mcp: {
        context7: { enabled: false },
      },
    };
    await applyMcpConfig({ config, pluginConfig: makePluginConfig() });
    const mcp = config.mcp as Record<string, unknown>;
    const c7 = mcp.context7 as Record<string, unknown>;
    expect('context7' in mcp).toBe(true);
    expect(c7.enabled).toBe(false);
  });

  it('hard-disables MCPs via disabled_mcps array (removes entirely)', async () => {
    const config: Record<string, unknown> = {};
    await applyMcpConfig({
      config,
      pluginConfig: makePluginConfig({ disabled_mcps: ['context7'] }),
    });
    const mcp = config.mcp as Record<string, unknown>;
    expect('context7' in mcp).toBe(false);
  });

  it('handles empty config with no mcp field', async () => {
    const config: Record<string, unknown> = {};
    await applyMcpConfig({ config, pluginConfig: makePluginConfig() });
    expect(typeof config.mcp).toBe('object');
    expect(config.mcp).not.toBeNull();
  });

  it('disabled_mcps overrides user config (user added custom config for disabled MCP)', async () => {
    const config: Record<string, unknown> = {
      mcp: {
        websearch: { type: 'remote', url: 'https://custom.example.com', enabled: true },
      },
    };
    await applyMcpConfig({
      config,
      pluginConfig: makePluginConfig({ disabled_mcps: ['websearch'] }),
    });
    const mcp = config.mcp as Record<string, unknown>;
    expect('websearch' in mcp).toBe(false);
  });
});
