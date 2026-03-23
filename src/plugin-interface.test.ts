import { describe, it, expect } from 'vitest';
import { createPluginInterface } from './plugin-interface.ts';
import type { GstackConfig } from './types/config.ts';
import type { Orchestrator } from './features/orchestrator/index.ts';
import type { Managers } from './create-managers.ts';
import { GstackConfigSchema } from './config/schema/index.ts';

describe('createPluginInterface', () => {
  const defaultConfig = GstackConfigSchema.parse({}) as GstackConfig;

  const mockMcpManager = {
    disconnectSession: async (): Promise<void> => {},
    disconnectAll: async (): Promise<void> => {},
  };

  const mockManagers: Managers = {
    configHandler: async (): Promise<void> => {},
    skillMcpManager: mockMcpManager as unknown as Managers['skillMcpManager'],
    sprintBacklog: {} as unknown as Managers['sprintBacklog'],
  };

  const mockOrchestrator: Orchestrator = {
    classify: () => ({
      phase: 'build' as const,
      confidence: 0.8,
      suggestedAgent: 'builder' as const,
      suggestedSkills: [],
      reasoning: 'test',
    }),
    delegate: () => null,
  };

  const baseParams = {
    ctx: { directory: '/tmp' },
    pluginConfig: defaultConfig,
    managers: mockManagers,
    hooks: {},
    tools: {},
    orchestrator: mockOrchestrator,
    skills: [],
    agents: [],
  };

  it('returns an object with all required hook handlers', () => {
    const pi = createPluginInterface(baseParams);

    expect(typeof pi).toBe('object');
    expect(typeof pi['config']).toBe('function');
    expect(typeof pi['tool.execute.before']).toBe('function');
    expect(typeof pi['tool.execute.after']).toBe('function');
    expect(typeof pi['event']).toBe('function');
    expect(typeof pi['chat.message']).toBe('function');
    expect(typeof pi['chat.params']).toBe('function');
  });

  it('config handler is managers.configHandler', () => {
    const pi = createPluginInterface(baseParams);
    expect(pi['config']).toBe(mockManagers.configHandler);
  });

  it('tool handler is the tools record', () => {
    const tools = { myTool: { name: 'myTool' } };
    const pi = createPluginInterface({ ...baseParams, tools });
    expect(pi['tool']).toBe(tools);
  });

  it('all stub handlers are callable', async () => {
    const pi = createPluginInterface(baseParams);

    const handlers = [
      'chat.params',
      'chat.headers',
      'experimental.chat.messages.transform',
      'experimental.chat.system.transform',
      'tool.execute.before',
      'tool.execute.after',
      'tool.definition',
    ] as const;

    for (const key of handlers) {
      const handler = pi[key] as Function;
      await expect(handler({}, {})).resolves.toBeUndefined();
    }
  });

  it('chat.message calls orchestrator classify+delegate in multi-agent mode', async () => {
    let classified = false;
    const trackingOrchestrator: Orchestrator = {
      classify: (text) => {
        classified = true;
        return mockOrchestrator.classify(text);
      },
      delegate: () => null,
    };
    const multiAgentConfig = GstackConfigSchema.parse({
      orchestration_mode: 'multi-agent',
    }) as GstackConfig;
    const pi = createPluginInterface({
      ...baseParams,
      pluginConfig: multiAgentConfig,
      orchestrator: trackingOrchestrator,
    });
    const handler = pi['chat.message'] as Function;
    await handler({ text: '/review' });
    expect(classified).toBe(true);
  });

  it('event session.deleted disconnects MCP session', async () => {
    let disconnectedId: string | null = null;
    const trackingManagers: Managers = {
      ...mockManagers,
      skillMcpManager: {
        ...mockMcpManager,
        disconnectSession: async (id: string): Promise<void> => {
          disconnectedId = id;
        },
      } as unknown as Managers['skillMcpManager'],
    };
    const pi = createPluginInterface({ ...baseParams, managers: trackingManagers });
    const handler = pi['event'] as Function;
    await handler({ type: 'session.deleted', properties: { info: { id: 'ses_test123' } } });
    expect(disconnectedId).toBe('ses_test123');
  });
});
