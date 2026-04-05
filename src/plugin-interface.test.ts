import { describe, it, expect } from 'vitest';
import { createPluginInterface } from './plugin-interface.ts';
import { DeferredMcpInvoker } from './create-managers.ts';
import type { GstackConfig } from './types/config.ts';
import type { Orchestrator } from './features/orchestrator/index.ts';
import { DelegationStateManager } from './features/orchestrator/index.ts';
import type { Managers } from './create-managers.ts';
import { GstackConfigSchema } from './config/schema/index.ts';
import type { GstackAgent } from './types/agent.ts';
import type { BuiltinSkill } from './types/skill.ts';
import type { HookRegistry } from './types/hooks.ts';

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
    mcpInvoker: new DeferredMcpInvoker(),
    workspaceState: {
      boulder: {
        read: () => null,
        write: () => true,
        append: () => null,
        clear: () => false,
        upsert: () => null,
      },
      plans: {} as unknown as Managers['workspaceState']['plans'],
      sessions: {
        start: async () => null as unknown,
        complete: async () => null,
        getActive: async () => [],
        cleanup: async () => 0,
      } as unknown as Managers['workspaceState']['sessions'],
      reviews: {} as unknown as Managers['workspaceState']['reviews'],
      notepads: () => ({}) as unknown as ReturnType<Managers['workspaceState']['notepads']>,
      ensureDir: () => {},
    },
    analytics: {} as unknown as Managers['analytics'],
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

  const mockHookRegistry: HookRegistry = {
    register: () => {},
    dispatch: async () => {},
    getHandlerCount: () => 0,
  };

  const baseParams = {
    ctx: { directory: '/tmp' },
    pluginConfig: defaultConfig,
    managers: mockManagers,
    hooks: mockHookRegistry,
    tools: {},
    orchestrator: mockOrchestrator,
    delegationState: new DelegationStateManager(),
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
      'tool.execute.before',
      'tool.execute.after',
      'tool.definition',
    ] as const;

    for (const key of handlers) {
      const handler = pi[key] as Function;
      await expect(handler({}, {})).resolves.toBeUndefined();
    }
  });

  it('experimental.chat.system.transform is a no-op with no sessionID', async () => {
    const pi = createPluginInterface(baseParams);
    const handler = pi['experimental.chat.system.transform'] as Function;
    const output = { system: [] };
    await handler({}, output);
    expect(output.system).toHaveLength(0);
  });

  it('experimental.chat.system.transform is a no-op with no stored delegation', async () => {
    const pi = createPluginInterface(baseParams);
    const handler = pi['experimental.chat.system.transform'] as Function;
    const output = { system: [] };
    await handler({ sessionID: 'ses_unknown' }, output);
    expect(output.system).toHaveLength(0);
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
    await handler(
      { sessionID: 'ses_test' },
      { message: null, parts: [{ type: 'text', text: '/review' }] }
    );
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

  it('chat.message stores delegation result in delegationState', async () => {
    const builderAgent: GstackAgent = {
      role: 'builder',
      name: 'builder',
      description: 'builder agent',
      sprintPhase: 'build',
      skills: [],
      instructions: 'Build things.',
    };
    const implementSkill: BuiltinSkill = {
      name: 'implement',
      description: 'implement skill',
      template: '',
    };
    const delegatingOrchestrator: Orchestrator = {
      classify: () => ({
        phase: 'build' as const,
        confidence: 0.9,
        suggestedAgent: 'builder' as const,
        suggestedSkills: ['implement'],
        reasoning: 'Build intent detected',
      }),
      delegate: () => ({
        agent: builderAgent,
        skills: [implementSkill],
        phase: 'build' as const,
        reasoning: 'Build intent detected',
      }),
    };
    const multiAgentConfig = GstackConfigSchema.parse({
      orchestration_mode: 'multi-agent',
    }) as GstackConfig;
    const delegationState = new DelegationStateManager();
    const pi = createPluginInterface({
      ...baseParams,
      pluginConfig: multiAgentConfig,
      orchestrator: delegatingOrchestrator,
      delegationState,
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'ses_abc123' },
      { message: null, parts: [{ type: 'text', text: 'implement this feature' }] }
    );

    const stored = delegationState.getDelegation('ses_abc123');
    expect(stored).not.toBeNull();
    expect(stored?.agent.role).toBe('builder');
    expect(stored?.phase).toBe('build');
  });

  it('chat.message does not store delegation when sessionID is absent', async () => {
    const builderAgent: GstackAgent = {
      role: 'builder',
      name: 'builder',
      description: 'builder agent',
      sprintPhase: 'build',
      skills: [],
      instructions: '',
    };
    const delegatingOrchestrator: Orchestrator = {
      classify: () => ({
        phase: 'build' as const,
        confidence: 0.9,
        suggestedAgent: 'builder' as const,
        suggestedSkills: [],
        reasoning: 'test',
      }),
      delegate: () => ({
        agent: builderAgent,
        skills: [],
        phase: 'build' as const,
        reasoning: 'test',
      }),
    };
    const multiAgentConfig = GstackConfigSchema.parse({
      orchestration_mode: 'multi-agent',
    }) as GstackConfig;
    const delegationState = new DelegationStateManager();
    const pi = createPluginInterface({
      ...baseParams,
      pluginConfig: multiAgentConfig,
      orchestrator: delegatingOrchestrator,
      delegationState,
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      {},
      { message: null, parts: [{ type: 'text', text: 'implement this feature' }] }
    );

    expect(delegationState.getDelegation('')).toBeNull();
  });

  it('experimental.chat.system.transform injects delegation context into system array', async () => {
    const builderAgent: GstackAgent = {
      role: 'builder',
      name: 'builder',
      description: 'builder agent',
      sprintPhase: 'build',
      skills: [],
      instructions: 'Build things carefully.',
    };
    const implementSkill: BuiltinSkill = {
      name: 'implement',
      description: 'Implementation skill',
      template: '',
    };
    const delegationState = new DelegationStateManager();
    delegationState.setDelegation('ses_transform', {
      agent: builderAgent,
      skills: [implementSkill],
      phase: 'build',
      reasoning: 'Build phase matched',
    });

    const pi = createPluginInterface({ ...baseParams, delegationState });
    const handler = pi['experimental.chat.system.transform'] as Function;
    const output = { system: ['Original system prompt.'] };
    await handler({ sessionID: 'ses_transform' }, output);

    const joined = output.system.join('\n');
    expect(output.system.length).toBeGreaterThan(1);
    expect(joined).toContain('Original system prompt.');
    expect(joined).toContain('## Active Agent Context');
    expect(joined).toContain('**Agent:** builder (builder)');
    expect(joined).toContain('**Sprint Phase:** build');
    expect(joined).toContain('Build things carefully.');
    expect(joined).toContain('#### /implement');
  });

  it('experimental.chat.system.transform adds context even with empty system array', async () => {
    const builderAgent: GstackAgent = {
      role: 'builder',
      name: 'builder',
      description: 'builder agent',
      sprintPhase: 'build',
      skills: [],
      instructions: '',
    };
    const delegationState = new DelegationStateManager();
    delegationState.setDelegation('ses_new', {
      agent: builderAgent,
      skills: [],
      phase: 'build',
      reasoning: 'test',
    });

    const pi = createPluginInterface({ ...baseParams, delegationState });
    const handler = pi['experimental.chat.system.transform'] as Function;
    const output = { system: [] };
    await handler({ sessionID: 'ses_new' }, output);

    expect(output.system.length).toBeGreaterThan(0);
    expect(output.system.join('\n')).toContain('## Active Agent Context');
  });

  it('event session.deleted clears delegation state', async () => {
    const builderAgent: GstackAgent = {
      role: 'builder',
      name: 'builder',
      description: 'builder agent',
      sprintPhase: 'build',
      skills: [],
      instructions: '',
    };
    const delegationState = new DelegationStateManager();
    delegationState.setDelegation('ses_del', {
      agent: builderAgent,
      skills: [],
      phase: 'build',
      reasoning: 'test',
    });

    const pi = createPluginInterface({ ...baseParams, delegationState });
    const handler = pi['event'] as Function;
    await handler({ type: 'session.deleted', properties: { info: { id: 'ses_del' } } });

    expect(delegationState.getDelegation('ses_del')).toBeNull();
  });
});
