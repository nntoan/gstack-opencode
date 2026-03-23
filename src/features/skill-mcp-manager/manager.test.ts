import { describe, it, expect, vi } from 'vitest';
import { SkillMcpManager } from './manager.ts';
import type { SkillMcpClientInfo, SkillMcpServerContext } from './types.ts';

describe('SkillMcpManager', () => {
  const info: SkillMcpClientInfo = {
    serverName: 'test-server',
    skillName: 'test-skill',
    sessionID: 'session-1',
  };

  const context: SkillMcpServerContext = {
    skillName: 'test-skill',
    config: {
      type: 'remote',
      url: 'https://example.com/mcp',
      enabled: true,
    },
  };

  it('instantiates without blocking', () => {
    const manager = new SkillMcpManager();
    expect(manager).toBeInstanceOf(SkillMcpManager);
  });

  it('getConnectedServers returns empty array initially', () => {
    const manager = new SkillMcpManager();
    expect(manager.getConnectedServers()).toEqual([]);
  });

  it('isConnected returns false for unknown client', () => {
    const manager = new SkillMcpManager();
    expect(manager.isConnected(info)).toBe(false);
  });

  it('disconnectAll resolves on empty state', async () => {
    const manager = new SkillMcpManager();
    await expect(manager.disconnectAll()).resolves.toBeUndefined();
  });

  it('listTools delegates through retry client and returns tools', async () => {
    const manager = new SkillMcpManager();
    const mockListTools = vi
      .fn()
      .mockResolvedValue({ tools: [{ name: 'tool-a', inputSchema: { type: 'object' } }] });
    const mockClient = {
      listTools: mockListTools,
      listResources: vi.fn(),
      callTool: vi.fn(),
      readResource: vi.fn(),
    };

    vi.spyOn(manager as never, 'getOrCreateClientWithRetry').mockResolvedValue(mockClient as never);

    const tools = await manager.listTools(info, context);
    expect(tools).toHaveLength(1);
    expect(mockListTools).toHaveBeenCalledTimes(1);
  });

  it('callTool returns content from MCP client', async () => {
    const manager = new SkillMcpManager();
    const mockCallTool = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });
    const mockClient = {
      listTools: vi.fn(),
      listResources: vi.fn(),
      callTool: mockCallTool,
      readResource: vi.fn(),
    };

    vi.spyOn(manager as never, 'getOrCreateClientWithRetry').mockResolvedValue(mockClient as never);

    const result = await manager.callTool(info, context, 'tool-a', { value: 1 });
    expect(result).toEqual([{ type: 'text', text: 'ok' }]);
    expect(mockCallTool).toHaveBeenCalledWith({ name: 'tool-a', arguments: { value: 1 } });
  });
});
