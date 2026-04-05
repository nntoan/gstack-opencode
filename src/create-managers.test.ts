import { describe, it, expect } from 'vitest';
import { DeferredMcpInvoker, createManagers } from './create-managers.ts';
import type { McpToolInvoker } from './features/skill-mcp-manager/index.ts';
import { GstackConfigSchema } from './config/schema/index.ts';

describe('DeferredMcpInvoker', () => {
  it('isConnected returns false before connect()', () => {
    const invoker = new DeferredMcpInvoker();
    expect(invoker.isConnected).toBe(false);
  });

  it('isConnected returns true after connect()', () => {
    const invoker = new DeferredMcpInvoker();
    const delegate: McpToolInvoker = {
      async invoke(): Promise<unknown> {
        return null;
      },
    };
    invoker.connect(delegate);
    expect(invoker.isConnected).toBe(true);
  });

  it('throws a meaningful error when invoke() is called before connect()', async () => {
    const invoker = new DeferredMcpInvoker();

    await expect(invoker.invoke('my-server', 'my-tool', {})).rejects.toThrow(
      '[gstack] MCP invoke not yet connected: my-server/my-tool.'
    );
  });

  it('throws error that mentions server and tool name', async () => {
    const invoker = new DeferredMcpInvoker();

    const error = await invoker.invoke('backlog_md', 'backlog_task_list', {}).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('backlog_md/backlog_task_list');
  });

  it('delegates invoke() to the connected invoker after connect()', async () => {
    const invoker = new DeferredMcpInvoker();
    const expectedResult = { id: 'task-1', title: 'Test task' };

    const delegate: McpToolInvoker = {
      async invoke(_serverName, _toolName, _args): Promise<unknown> {
        return expectedResult;
      },
    };

    invoker.connect(delegate);
    const result = await invoker.invoke('backlog_md', 'backlog_task_create', { title: 'Test' });

    expect(result).toEqual(expectedResult);
  });

  it('passes serverName, toolName, and args to the delegate', async () => {
    const invoker = new DeferredMcpInvoker();

    let capturedServer = '';
    let capturedTool = '';
    let capturedArgs: Record<string, unknown> = {};

    const delegate: McpToolInvoker = {
      async invoke(
        serverName: string,
        toolName: string,
        args: Record<string, unknown>
      ): Promise<unknown> {
        capturedServer = serverName;
        capturedTool = toolName;
        capturedArgs = args;
        return 'ok';
      },
    };

    invoker.connect(delegate);
    await invoker.invoke('test-server', 'test-tool', { key: 'value' });

    expect(capturedServer).toBe('test-server');
    expect(capturedTool).toBe('test-tool');
    expect(capturedArgs).toEqual({ key: 'value' });
  });

  it('uses empty object when args is omitted', async () => {
    const invoker = new DeferredMcpInvoker();
    let capturedArgs: Record<string, unknown> = { sentinel: true };

    const delegate: McpToolInvoker = {
      async invoke(_s, _t, args: Record<string, unknown>): Promise<unknown> {
        capturedArgs = args;
        return null;
      },
    };

    invoker.connect(delegate);
    await invoker.invoke('s', 't');

    expect(capturedArgs).toEqual({});
  });

  it('connect() can replace an existing delegate', async () => {
    const invoker = new DeferredMcpInvoker();

    const firstDelegate: McpToolInvoker = {
      async invoke(): Promise<unknown> {
        return 'first';
      },
    };
    const secondDelegate: McpToolInvoker = {
      async invoke(): Promise<unknown> {
        return 'second';
      },
    };

    invoker.connect(firstDelegate);
    invoker.connect(secondDelegate);

    const result = await invoker.invoke('s', 't', {});
    expect(result).toBe('second');
  });
});

describe('createManagers', () => {
  const pluginConfig = GstackConfigSchema.parse({});

  it('returns a Managers object with all required properties', () => {
    const managers = createManagers({
      ctx: { directory: '/tmp' },
      pluginConfig,
    });

    expect(managers.skillMcpManager).toBeDefined();
    expect(typeof managers.configHandler).toBe('function');
    expect(managers.sprintBacklog).toBeDefined();
    expect(managers.mcpInvoker).toBeInstanceOf(DeferredMcpInvoker);
  });

  it('mcpInvoker starts in disconnected state', () => {
    const managers = createManagers({
      ctx: { directory: '/tmp' },
      pluginConfig,
    });

    expect(managers.mcpInvoker.isConnected).toBe(false);
  });

  it('sprintBacklog degrades gracefully when mcpInvoker is not yet connected', async () => {
    const managers = createManagers({
      ctx: { directory: '/tmp' },
      pluginConfig,
    });

    const availability = await managers.sprintBacklog.isAvailable();
    expect(availability.available).toBe(false);
  });

  it('sprintBacklog works after mcpInvoker is connected', async () => {
    const managers = createManagers({
      ctx: { directory: '/tmp' },
      pluginConfig,
    });

    const connectedDelegate: McpToolInvoker = {
      async invoke(): Promise<unknown> {
        return [];
      },
    };
    managers.mcpInvoker.connect(connectedDelegate);

    const availability = await managers.sprintBacklog.isAvailable();
    expect(availability.available).toBe(true);
    expect(managers.mcpInvoker.isConnected).toBe(true);
  });
});
