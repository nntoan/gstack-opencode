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
