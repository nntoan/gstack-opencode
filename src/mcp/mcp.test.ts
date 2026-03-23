import { describe, it, expect } from 'vitest';
import { createBuiltinMcps, McpNameSchema } from './index.ts';

describe('createBuiltinMcps', () => {
  it('returns all 5 MCP configs when nothing is disabled', () => {
    const mcps = createBuiltinMcps([]);
    const keys = Object.keys(mcps).sort();
    expect(keys).toEqual(['backlog_md', 'context7', 'contexthub', 'grep_app', 'websearch']);
  });

  it('excludes disabled MCPs', () => {
    const mcps = createBuiltinMcps(['websearch', 'contexthub']);
    const keys = Object.keys(mcps).sort();
    expect(keys).toEqual(['backlog_md', 'context7', 'grep_app']);
  });

  it('excludes a single disabled MCP', () => {
    const mcps = createBuiltinMcps(['websearch']);
    expect('websearch' in mcps).toBe(false);
    expect(Object.keys(mcps)).toHaveLength(4);
  });

  it('returns empty object when all MCPs are disabled', () => {
    const mcps = createBuiltinMcps([
      'websearch',
      'context7',
      'grep_app',
      'contexthub',
      'backlog_md',
    ]);
    expect(Object.keys(mcps)).toHaveLength(0);
  });

  it('contexthub and backlog_md use stdio type', () => {
    const mcps = createBuiltinMcps([]);
    expect(mcps.contexthub.type).toBe('stdio');
    expect(mcps.backlog_md.type).toBe('stdio');
  });

  it('context7 and grep_app use remote type', () => {
    const mcps = createBuiltinMcps([]);
    expect(mcps.context7.type).toBe('remote');
    expect(mcps.grep_app.type).toBe('remote');
  });

  it('websearch defaults to remote type with exa URL', () => {
    const mcps = createBuiltinMcps([]);
    expect(mcps.websearch.type).toBe('remote');
    if (mcps.websearch.type === 'remote') {
      expect(mcps.websearch.url).toContain('exa.ai');
    }
  });

  it('context7 URL is correct', () => {
    const mcps = createBuiltinMcps([]);
    if (mcps.context7.type === 'remote') {
      expect(mcps.context7.url).toBe('https://mcp.context7.com/mcp');
    }
  });

  it('grep_app URL is correct', () => {
    const mcps = createBuiltinMcps([]);
    if (mcps.grep_app.type === 'remote') {
      expect(mcps.grep_app.url).toBe('https://mcp.grep.app');
    }
  });

  it('contexthub uses npx command with correct args', () => {
    const mcps = createBuiltinMcps([]);
    if (mcps.contexthub.type === 'stdio') {
      expect(mcps.contexthub.command).toBe('npx');
      expect(mcps.contexthub.args).toEqual(['contexthub']);
    }
  });

  it('backlog_md uses npx command with correct args', () => {
    const mcps = createBuiltinMcps([]);
    if (mcps.backlog_md.type === 'stdio') {
      expect(mcps.backlog_md.command).toBe('npx');
      expect(mcps.backlog_md.args).toEqual(['backlog-md']);
    }
  });

  it('all MCPs are enabled by default', () => {
    const mcps = createBuiltinMcps([]);
    for (const mcp of Object.values(mcps)) {
      expect(mcp.enabled).toBe(true);
    }
  });

  it('accepts optional GstackConfig without error', () => {
    const mcps = createBuiltinMcps([], {
      orchestration_mode: 'multi-agent',
      disabled_skills: [],
      disabled_agents: [],
      disabled_mcps: [],
      disabled_hooks: [],
      backlog: { enabled: true, auto_create_tasks: true, auto_update_status: true },
    });
    expect(Object.keys(mcps)).toHaveLength(5);
  });
});

describe('McpNameSchema', () => {
  it('accepts all 5 valid MCP names', () => {
    const validNames = ['websearch', 'context7', 'contexthub', 'grep_app', 'backlog_md'];
    for (const name of validNames) {
      expect(() => McpNameSchema.parse(name)).not.toThrow();
    }
  });

  it('rejects invalid MCP names', () => {
    expect(() => McpNameSchema.parse('invalid')).toThrow();
    expect(() => McpNameSchema.parse('')).toThrow();
  });
});
