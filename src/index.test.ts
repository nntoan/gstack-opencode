import * as os from 'os';
import { describe, it, expect } from 'vitest';
import type { PluginInput } from '@opencode-ai/plugin';
import GstackPlugin from './index.ts';

const testInput: PluginInput = {
  directory: '/tmp',
  client: {} as PluginInput['client'],
  project: {} as PluginInput['project'],
  worktree: '/tmp',
  serverUrl: new URL('http://localhost:3000'),
  $: {} as PluginInput['$'],
};

function makeTmpInput(): PluginInput {
  return {
    directory: os.tmpdir(),
    client: {} as PluginInput['client'],
    project: {} as PluginInput['project'],
    worktree: os.tmpdir(),
    serverUrl: new URL('http://localhost:3000'),
    $: {} as PluginInput['$'],
  };
}

describe('GstackPlugin', () => {
  it('is a function', () => {
    expect(typeof GstackPlugin).toBe('function');
  });

  it('returns a plugin interface when called', async () => {
    const result = await GstackPlugin(testInput);
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
  });
});

describe('GstackPlugin integration', () => {
  it('boots successfully with default config and returns all expected handlers', async () => {
    const result = await GstackPlugin(makeTmpInput());

    expect(result).toBeDefined();
    expect(typeof result['config']).toBe('function');
    expect(typeof result['chat.message']).toBe('function');
    expect(typeof result['chat.params']).toBe('function');
    expect(typeof result['chat.headers']).toBe('function');
    expect(typeof result['event']).toBe('function');
    expect(typeof result['tool.execute.before']).toBe('function');
    expect(typeof result['tool.execute.after']).toBe('function');
    expect(typeof result['tool.definition']).toBe('function');
    expect(typeof result['experimental.chat.system.transform']).toBe('function');
    expect(typeof result['experimental.chat.messages.transform']).toBe('function');
  });

  it('chat.message handler processes /ship command without error', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const handler = result['chat.message'] as (input: unknown) => Promise<void>;

    await expect(handler({ text: '/ship', sessionID: 'test-session' })).resolves.toBeUndefined();
  });

  it('chat.message handler is a no-op for empty text', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const handler = result['chat.message'] as (input: unknown) => Promise<void>;

    await expect(handler({ text: '', sessionID: 'test-session' })).resolves.toBeUndefined();
    await expect(handler({ sessionID: 'test-session' })).resolves.toBeUndefined();
  });

  it('config handler applies skills and agents', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const configHandler = result['config'] as (config: Record<string, unknown>) => Promise<void>;

    const config: Record<string, unknown> = {};
    await configHandler(config);

    expect(config.commands).toBeDefined();
    expect(typeof config.commands).toBe('object');

    // Default mode is multi-agent — agents should be registered
    expect(config.agent).toBeDefined();
    expect(typeof config.agent).toBe('object');
  });

  it('config handler populates at least one skill command', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const configHandler = result['config'] as (config: Record<string, unknown>) => Promise<void>;

    const config: Record<string, unknown> = {};
    await configHandler(config);

    const commands = config.commands as Record<string, unknown>;
    expect(Object.keys(commands).length).toBeGreaterThan(0);
  });

  it('config handler populates at least one agent entry', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const configHandler = result['config'] as (config: Record<string, unknown>) => Promise<void>;

    const config: Record<string, unknown> = {};
    await configHandler(config);

    const agents = config.agent as Record<string, unknown>;
    expect(Object.keys(agents).length).toBeGreaterThan(0);
  });

  it('event handler cleans up on session.deleted', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const eventHandler = result['event'] as (input: unknown) => Promise<void>;

    await expect(
      eventHandler({ type: 'session.deleted', properties: { info: { id: 'test-123' } } })
    ).resolves.toBeUndefined();
  });

  it('event handler is a no-op for unknown event types', async () => {
    const result = await GstackPlugin(makeTmpInput());
    const eventHandler = result['event'] as (input: unknown) => Promise<void>;

    await expect(eventHandler({ type: 'unknown.event', properties: {} })).resolves.toBeUndefined();
  });

  it('no-op handlers resolve without error', async () => {
    const result = await GstackPlugin(makeTmpInput());

    const noopHandlers = [
      'chat.params',
      'chat.headers',
      'tool.execute.before',
      'tool.execute.after',
      'tool.definition',
      'experimental.chat.system.transform',
      'experimental.chat.messages.transform',
    ] as const;

    for (const key of noopHandlers) {
      const handler = result[key] as () => Promise<void>;
      await expect(handler()).resolves.toBeUndefined();
    }
  });
});
