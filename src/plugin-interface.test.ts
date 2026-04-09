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
import { COMPANY_ARTIFACT_OWNERSHIP } from './features/company/index.ts';
import type { CompanyCheckpoint, CompanyState } from './features/company/index.ts';

describe('createPluginInterface', () => {
  const defaultConfig = GstackConfigSchema.parse({}) as GstackConfig;

  const makeCompanyState = (overrides: Partial<CompanyState> = {}): CompanyState => ({
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: '2026-04-09T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    session_ids: ['sess-1'],
    workflow_id: 'workflow-1',
    current_attempt: 1,
    retry_lineage: {
      parent_workflow_id: 'workflow-1',
      current_attempt: 1,
      child_attempt_ids: [],
      safe_retry_checkpoint_ids: [],
    },
    ownership: COMPANY_ARTIFACT_OWNERSHIP,
    ...overrides,
  });

  const makeClassifiedIntent = (
    overrides: Partial<ReturnType<Orchestrator['classify']>> = {}
  ): ReturnType<Orchestrator['classify']> => ({
    phase: 'build',
    confidence: 0.8,
    suggestedAgent: 'builder',
    suggestedSkills: [],
    reasoning: 'Matched 2 patterns for build',
    ...overrides,
  });

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
      company: {
        read: () => null,
        readResolved: () => null,
        write: () => true,
        appendLog: () => {},
        readLog: () => [],
        writeCheckpoint: () => true,
        readCheckpoint: () => null,
        writeDecisionWait: () => true,
        resolveDecisionWait: () => true,
        archiveDecisionWait: () => true,
        registerSafeRetryCheckpoint: () => true,
        recordRetryAttempt: () => true,
      },
    },
    analytics: {} as unknown as Managers['analytics'],
  };

  const mockOrchestrator: Orchestrator = {
    classify: () => makeClassifiedIntent(),
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

  function createStatefulManagers(options?: { companyState?: CompanyState | null }): Managers {
    let companyState = options?.companyState ?? null;
    const checkpoints: CompanyCheckpoint[] = [];

    return {
      ...mockManagers,
      workspaceState: {
        ...mockManagers.workspaceState,
        company: {
          read: () => companyState,
          readResolved: () => companyState,
          write: (state: CompanyState) => {
            companyState = state;
            return true;
          },
          appendLog: () => {},
          readLog: () => [],
          writeCheckpoint: (checkpoint: CompanyCheckpoint) => {
            checkpoints.push(checkpoint);
            return true;
          },
          readCheckpoint: (checkpointId: string) =>
            checkpoints.find((checkpoint) => checkpoint.id === checkpointId) ?? null,
          writeDecisionWait: (wait) => {
            if (!companyState) {
              return false;
            }

            companyState = {
              ...companyState,
              pending_decision_wait: wait,
              updated_at: '2026-04-09T00:10:00.000Z',
            };
            return true;
          },
          resolveDecisionWait: (waitId: string, answer: string) => {
            if (
              !companyState?.pending_decision_wait ||
              companyState.pending_decision_wait.id !== waitId
            ) {
              return false;
            }

            if (companyState.pending_decision_wait.status === 'answered') {
              return true;
            }

            companyState = {
              ...companyState,
              pending_decision_wait: {
                ...companyState.pending_decision_wait,
                status: 'answered',
                answer,
                answered_at: '2026-04-09T00:11:00.000Z',
              },
              updated_at: '2026-04-09T00:11:00.000Z',
            };
            return true;
          },
          archiveDecisionWait: (waitId: string) => {
            if (
              !companyState?.pending_decision_wait ||
              companyState.pending_decision_wait.id !== waitId
            ) {
              return false;
            }

            companyState = {
              ...companyState,
              pending_decision_wait: undefined,
              archived_decision_waits: [
                ...(companyState.archived_decision_waits ?? []),
                {
                  ...companyState.pending_decision_wait,
                  status: 'archived',
                },
              ],
              updated_at: '2026-04-09T00:12:00.000Z',
            };
            return true;
          },
          registerSafeRetryCheckpoint: (checkpointId: string) => {
            if (!companyState?.retry_lineage) {
              return false;
            }

            companyState = {
              ...companyState,
              retry_lineage: {
                ...companyState.retry_lineage,
                safe_retry_checkpoint_ids:
                  companyState.retry_lineage.safe_retry_checkpoint_ids.includes(checkpointId)
                    ? companyState.retry_lineage.safe_retry_checkpoint_ids
                    : [...companyState.retry_lineage.safe_retry_checkpoint_ids, checkpointId],
              },
            };
            return true;
          },
          recordRetryAttempt: (checkpointId: string) => {
            if (!companyState?.retry_lineage) {
              return false;
            }

            if (!companyState.retry_lineage.safe_retry_checkpoint_ids.includes(checkpointId)) {
              return false;
            }

            const nextAttempt = companyState.retry_lineage.current_attempt + 1;
            companyState = {
              ...companyState,
              current_attempt: nextAttempt,
              retry_lineage: {
                ...companyState.retry_lineage,
                current_attempt: nextAttempt,
                child_attempt_ids: [
                  ...companyState.retry_lineage.child_attempt_ids,
                  `${companyState.workflow_id}:attempt:${nextAttempt}`,
                ],
                last_retry_checkpoint_id: checkpointId,
              },
            };
            return true;
          },
        },
      },
    };
  }

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
    expect(joined).toContain('## The Company — Active Context');
    expect(joined).toContain('**Phase:** build');
    expect(joined).toContain('Build things carefully.');
    expect(joined).toContain('- **/implement**: Implementation skill');
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
    expect(output.system.join('\n')).toContain('## The Company — Active Context');
  });

  it('company mode with low confidence stores pending ask context and skips delegation', async () => {
    let delegateCalls = 0;
    const lowConfidence = makeClassifiedIntent({
      phase: 'review',
      confidence: 0.4,
      suggestedAgent: 'reviewer',
    });
    const statefulManagers = createStatefulManagers();
    const orchestrator: Orchestrator = {
      classify: () => lowConfidence,
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    const pi = createPluginInterface({
      ...baseParams,
      managers: statefulManagers,
      orchestrator,
      delegationState,
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'ses_low' },
      { message: null, parts: [{ type: 'text', text: 'could you review or plan this?' }] }
    );

    expect(delegateCalls).toBe(0);
    const pending = delegationState.getPendingContext('ses_low');
    expect(pending?.kind).toBe('ask');
    expect(pending?.requestText).toBe('could you review or plan this?');
    expect(statefulManagers.workspaceState.company.read()?.pending_decision_wait?.status).toBe(
      'pending'
    );
  });

  it('company mode with middling confidence stores a confirmation wait without delegating', async () => {
    let delegateCalls = 0;
    const middling = makeClassifiedIntent({
      phase: 'ship',
      confidence: 0.6,
      suggestedAgent: 'release-engineer',
    });
    const statefulManagers = createStatefulManagers();
    const orchestrator: Orchestrator = {
      classify: () => middling,
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    const pi = createPluginInterface({
      ...baseParams,
      managers: statefulManagers,
      orchestrator,
      delegationState,
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'ses_confirm' },
      { message: null, parts: [{ type: 'text', text: 'ship this after review' }] }
    );

    expect(delegateCalls).toBe(0);
    const pending = delegationState.getPendingContext('ses_confirm');
    expect(pending?.kind).toBe('confirm');
    expect(pending?.prompt).toContain("I'm ready to proceed with the **ship** phase");
  });

  it('company mode delegates immediately for high confidence and annotates company metadata', async () => {
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
    const statefulManagers = createStatefulManagers();
    const orchestrationResult = {
      agent: builderAgent,
      skills: [implementSkill],
      phase: 'build' as const,
      reasoning: 'Build intent detected',
    };
    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent({ confidence: 0.9 }),
      delegate: () => orchestrationResult,
    };
    const delegationState = new DelegationStateManager();
    const pi = createPluginInterface({
      ...baseParams,
      managers: statefulManagers,
      orchestrator,
      delegationState,
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'ses_delegate' },
      { message: null, parts: [{ type: 'text', text: 'implement this feature' }] }
    );

    const stored = delegationState.getDelegation('ses_delegate');
    expect(stored?.visibleAgent).toBe('company');
    expect(stored?.specialistRole).toBe('builder');
    expect(stored?.confidence).toBe(0.9);
    expect(stored?.workflowId).toBeTruthy();
    expect(stored?.checkpointId).toBeTruthy();
    expect(delegationState.getPendingContext('ses_delegate')).toBeNull();
  });

  it('system.transform injects pending company context when delegation is withheld', async () => {
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('ses_pending', {
      prompt: 'I want to route this correctly.',
      kind: 'ask',
      phase: 'build',
      requestText: 'help me',
      deferredIntent: makeClassifiedIntent(),
    });

    const pi = createPluginInterface({ ...baseParams, delegationState });
    const handler = pi['experimental.chat.system.transform'] as Function;
    const output = { system: [] as string[] };
    await handler({ sessionID: 'ses_pending' }, output);

    expect(output.system).toContain('I want to route this correctly.');
  });

  it('event session.deleted clears pending context alongside delegation state', async () => {
    const statefulManagers = createStatefulManagers({
      companyState: makeCompanyState({
        visible_context: { status_summary: 'In progress' },
      }),
    });
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('ses_cleanup', {
      prompt: 'I want to route this correctly.',
      kind: 'ask',
      phase: 'build',
      requestText: 'help me',
      deferredIntent: makeClassifiedIntent(),
    });

    const pi = createPluginInterface({
      ...baseParams,
      managers: statefulManagers,
      delegationState,
    });
    const handler = pi['event'] as Function;
    await handler({ type: 'session.deleted', properties: { info: { id: 'ses_cleanup' } } });

    expect(delegationState.getPendingContext('ses_cleanup')).toBeNull();
    expect(
      statefulManagers.workspaceState.company.read()?.visible_context?.status_summary
    ).toContain('preserved the current workflow state');
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
