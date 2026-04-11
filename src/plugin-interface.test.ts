import { afterEach, describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import { writeCompanyState, registerDecisionAnswerInState } from './features/company/storage.ts';
import { createDecisionWait } from './features/company/company-decision-wait.ts';

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

describe('createPluginInterface — stale and replay gate (04-02)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'gstack-pi-gate-test-'));
    tempDirs.push(dir);
    return dir;
  }

  const makeCompanyState = (overrides: Partial<CompanyState> = {}): CompanyState => ({
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: '2026-04-09T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    session_ids: ['sess-gate'],
    workflow_id: 'wf-gate-1',
    current_attempt: 1,
    retry_lineage: {
      parent_workflow_id: 'wf-gate-1',
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

  const mockHookRegistry: HookRegistry = {
    register: () => {},
    dispatch: async () => {},
    getHandlerCount: () => 0,
  };

  const multiAgentCompanyConfig = GstackConfigSchema.parse({
    orchestration_mode: 'multi-agent',
    agent_surface: { mode: 'company' },
  }) as GstackConfig;

  function createStatefulManagers(
    options?: { companyState?: CompanyState | null },
    directory?: string
  ): Managers {
    let companyState = options?.companyState ?? null;
    const checkpoints: CompanyCheckpoint[] = [];

    return {
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
          read: () => companyState,
          readResolved: () => companyState,
          write: (state: CompanyState) => {
            companyState = state;
            if (directory) {
              writeCompanyState(directory, state);
            }
            return true;
          },
          appendLog: () => {},
          readLog: () => [],
          writeCheckpoint: (checkpoint: CompanyCheckpoint) => {
            checkpoints.push(checkpoint);
            return true;
          },
          readCheckpoint: (checkpointId: string) =>
            checkpoints.find((c) => c.id === checkpointId) ?? null,
          writeDecisionWait: (wait) => {
            if (!companyState) return false;
            companyState = { ...companyState, pending_decision_wait: wait };
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
          resolveDecisionWait: (waitId: string, answer: string) => {
            if (
              !companyState?.pending_decision_wait ||
              companyState.pending_decision_wait.id !== waitId
            ) {
              return false;
            }
            companyState = {
              ...companyState,
              pending_decision_wait: {
                ...companyState.pending_decision_wait,
                status: 'answered',
                answer,
                answered_at: new Date().toISOString(),
              },
            };
            if (directory) {
              writeCompanyState(directory, companyState);
            }
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
                { ...companyState.pending_decision_wait!, status: 'archived' },
              ],
            };
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
          registerSafeRetryCheckpoint: (checkpointId: string) => {
            if (!companyState?.retry_lineage) return false;
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
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
          recordRetryAttempt: (checkpointId: string) => {
            if (!companyState?.retry_lineage) return false;
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
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
        },
      },
      analytics: {} as unknown as Managers['analytics'],
    };
  }

  it('Test 1: a duplicate messageID answer is ignored and does not call classify or delegate', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-gate-1',
      checkpointId: 'cp-gate-1',
      question: 'Proceed with build?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-gate-1',
      pending_decision_wait: wait,
    });
    writeCompanyState(dir, initialState);

    const messageID = 'msg-dup-001';
    registerDecisionAnswerInState(dir, wait.id, messageID);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);

    let classifyCalls = 0;
    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => {
        classifyCalls += 1;
        return makeClassifiedIntent();
      },
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-gate', {
      prompt: 'Proceed with build?',
      kind: 'confirm',
      phase: 'build',
      requestText: 'build feature',
      workflowId: 'wf-gate-1',
      checkpointId: 'cp-gate-1',
      pendingWaitId: wait.id,
      deferredIntent: makeClassifiedIntent(),
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-gate', messageID },
      { message: null, parts: [{ type: 'text', text: 'yes' }] }
    );

    expect(classifyCalls).toBe(0);
    expect(delegateCalls).toBe(0);
    const state = statefulManagers.workspaceState.company.read();
    expect(state?.visible_context?.status_summary).toContain('already recorded');
  });

  it('Test 2: a control answer with no messageID uses fallback key and deduplicates', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-gate-2',
      checkpointId: 'cp-gate-2',
      question: 'Proceed with build?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      workflow_id: 'wf-gate-2',
      last_checkpoint_id: 'cp-gate-2',
      pending_decision_wait: wait,
    });
    writeCompanyState(dir, initialState);

    const fallbackKey = `${wait.id}:yes`;
    registerDecisionAnswerInState(dir, wait.id, fallbackKey);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);

    let classifyCalls = 0;
    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => {
        classifyCalls += 1;
        return makeClassifiedIntent();
      },
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-gate', {
      prompt: 'Proceed?',
      kind: 'confirm',
      phase: 'build',
      requestText: 'build feature',
      workflowId: 'wf-gate-2',
      checkpointId: 'cp-gate-2',
      pendingWaitId: wait.id,
      deferredIntent: makeClassifiedIntent(),
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-gate' },
      { message: null, parts: [{ type: 'text', text: 'yes' }] }
    );

    expect(classifyCalls).toBe(0);
    expect(delegateCalls).toBe(0);
    const state = statefulManagers.workspaceState.company.read();
    expect(state?.visible_context?.status_summary).toContain('already recorded');
  });

  it('Test 3: a yes/no/retry answer is marked stale when checkpoint id does not match', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-gate-3',
      checkpointId: 'cp-old-3',
      question: 'Proceed?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      workflow_id: 'wf-gate-3',
      last_checkpoint_id: 'cp-new-3',
      pending_decision_wait: wait,
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);

    let classifyCalls = 0;
    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => {
        classifyCalls += 1;
        return makeClassifiedIntent();
      },
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-gate', {
      prompt: 'Proceed?',
      kind: 'confirm',
      phase: 'build',
      requestText: 'build feature',
      workflowId: 'wf-gate-3',
      checkpointId: 'cp-old-3',
      pendingWaitId: wait.id,
      deferredIntent: makeClassifiedIntent(),
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-gate' },
      { message: null, parts: [{ type: 'text', text: 'yes' }] }
    );

    expect(classifyCalls).toBe(0);
    expect(delegateCalls).toBe(0);
  });

  it('Test 4: a stale answer updates visible_context with recovery recommendation and does not fork workflow', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-gate-4',
      checkpointId: 'cp-old-4',
      question: 'Proceed?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      workflow_id: 'wf-gate-4-new',
      last_checkpoint_id: 'cp-gate-4',
      pending_decision_wait: wait,
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);

    let classifyCalls = 0;
    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => {
        classifyCalls += 1;
        return makeClassifiedIntent();
      },
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-gate', {
      prompt: 'Proceed?',
      kind: 'confirm',
      phase: 'build',
      requestText: 'build feature',
      workflowId: 'wf-gate-4',
      checkpointId: 'cp-old-4',
      pendingWaitId: wait.id,
      deferredIntent: makeClassifiedIntent(),
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-gate' },
      { message: null, parts: [{ type: 'text', text: 'yes' }] }
    );

    expect(classifyCalls).toBe(0);
    expect(delegateCalls).toBe(0);
    const state = statefulManagers.workspaceState.company.read();
    expect(state?.visible_context?.status_summary).toContain('stale');
  });
});

describe('createPluginInterface — retry replay regression (04-02)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'gstack-pi-retry-test-'));
    tempDirs.push(dir);
    return dir;
  }

  const makeCompanyState = (overrides: Partial<CompanyState> = {}): CompanyState => ({
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: '2026-04-09T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    session_ids: ['sess-retry'],
    workflow_id: 'wf-retry-1',
    current_attempt: 1,
    retry_lineage: {
      parent_workflow_id: 'wf-retry-1',
      current_attempt: 1,
      child_attempt_ids: [],
      safe_retry_checkpoint_ids: ['cp-retry-safe'],
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

  const mockHookRegistry: HookRegistry = {
    register: () => {},
    dispatch: async () => {},
    getHandlerCount: () => 0,
  };

  const multiAgentCompanyConfig = GstackConfigSchema.parse({
    orchestration_mode: 'multi-agent',
    agent_surface: { mode: 'company' },
  }) as GstackConfig;

  function createRetryStatefulManagers(
    options?: { companyState?: CompanyState | null },
    directory?: string
  ): Managers {
    let companyState = options?.companyState ?? null;
    const checkpoints: CompanyCheckpoint[] = [];

    return {
      configHandler: async (): Promise<void> => {},
      skillMcpManager: {
        disconnectSession: async (): Promise<void> => {},
        disconnectAll: async (): Promise<void> => {},
      } as unknown as Managers['skillMcpManager'],
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
          read: () => companyState,
          readResolved: () => companyState,
          write: (state: CompanyState) => {
            companyState = state;
            if (directory) {
              writeCompanyState(directory, state);
            }
            return true;
          },
          appendLog: () => {},
          readLog: () => [],
          writeCheckpoint: (checkpoint: CompanyCheckpoint) => {
            checkpoints.push(checkpoint);
            return true;
          },
          readCheckpoint: (checkpointId: string) =>
            checkpoints.find((c) => c.id === checkpointId) ?? null,
          writeDecisionWait: (wait) => {
            if (!companyState) return false;
            companyState = { ...companyState, pending_decision_wait: wait };
            if (directory) writeCompanyState(directory, companyState);
            return true;
          },
          resolveDecisionWait: (waitId: string, answer: string) => {
            if (
              !companyState?.pending_decision_wait ||
              companyState.pending_decision_wait.id !== waitId
            ) {
              return false;
            }
            companyState = {
              ...companyState,
              pending_decision_wait: {
                ...companyState.pending_decision_wait,
                status: 'answered',
                answer,
                answered_at: new Date().toISOString(),
              },
            };
            if (directory) writeCompanyState(directory, companyState);
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
                { ...companyState.pending_decision_wait!, status: 'archived' },
              ],
            };
            if (directory) writeCompanyState(directory, companyState);
            return true;
          },
          registerSafeRetryCheckpoint: (checkpointId: string) => {
            if (!companyState?.retry_lineage) return false;
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
            if (directory) writeCompanyState(directory, companyState);
            return true;
          },
          recordRetryAttempt: (checkpointId: string) => {
            if (!companyState?.retry_lineage) return false;
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
            if (directory) writeCompanyState(directory, companyState);
            return true;
          },
        },
      },
      analytics: {} as unknown as Managers['analytics'],
    };
  }

  it('Test 1: safe retry increments current_attempt exactly once', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-retry-1',
      checkpointId: 'cp-retry-safe',
      question: 'Proceed?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-retry-safe',
      pending_decision_wait: wait,
      execution_context: {
        specialist_role: 'builder',
        classified_phase: 'build',
        confidence: 0.8,
        trace_visibility: 'hidden',
        retry_safe: true,
      },
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createRetryStatefulManagers({ companyState: initialState }, dir);

    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent(),
      delegate: () => null,
    };
    const delegationState = new DelegationStateManager();

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-retry' },
      { message: null, parts: [{ type: 'text', text: 'retry' }] }
    );

    const state = statefulManagers.workspaceState.company.read();
    expect(state?.current_attempt).toBe(2);
    expect(state?.visible_context?.status_summary).toContain('resumed');
  });

  it('Test 2: a replayed retry request does not increment current_attempt twice', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-retry-2',
      checkpointId: 'cp-retry-safe-2',
      question: 'Proceed?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      workflow_id: 'wf-retry-2',
      last_checkpoint_id: 'cp-retry-safe-2',
      pending_decision_wait: wait,
      retry_lineage: {
        parent_workflow_id: 'wf-retry-2',
        current_attempt: 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: ['cp-retry-safe-2'],
      },
      execution_context: {
        specialist_role: 'builder',
        classified_phase: 'build',
        confidence: 0.8,
        trace_visibility: 'hidden',
        retry_safe: true,
      },
    });
    writeCompanyState(dir, initialState);

    const retryKey = `${wait.id}:retry`;
    registerDecisionAnswerInState(dir, wait.id, retryKey);

    const statefulManagers = createRetryStatefulManagers({ companyState: initialState }, dir);

    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent(),
      delegate: () => null,
    };
    const delegationState = new DelegationStateManager();

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-retry' },
      { message: null, parts: [{ type: 'text', text: 'retry' }] }
    );

    const state = statefulManagers.workspaceState.company.read();
    expect(state?.current_attempt).toBe(1);
    expect(state?.visible_context?.status_summary).toContain('already recorded');
  });

  it('Test 3: an unsafe retry leaves the workflow unchanged', async () => {
    const dir = makeTempDir();
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-unsafe',
      retry_lineage: {
        parent_workflow_id: 'wf-retry-1',
        current_attempt: 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: [],
      },
      execution_context: {
        specialist_role: 'builder',
        classified_phase: 'build',
        confidence: 0.8,
        trace_visibility: 'hidden',
        retry_safe: false,
      },
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createRetryStatefulManagers({ companyState: initialState }, dir);

    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent(),
      delegate: () => null,
    };
    const delegationState = new DelegationStateManager();

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-retry' },
      { message: null, parts: [{ type: 'text', text: 'retry' }] }
    );

    const state = statefulManagers.workspaceState.company.read();
    expect(state?.current_attempt).toBe(1);
    expect(state?.visible_context?.status_summary).toContain('cannot retry');
  });

  it('Test 4: a stale retry after session turnover becomes a recovery prompt instead of a retry attempt', async () => {
    const dir = makeTempDir();
    const wait = createDecisionWait({
      workflowId: 'wf-old-4',
      checkpointId: 'cp-old-4',
      question: 'Proceed?',
      phase: 'build',
    });
    const initialState = makeCompanyState({
      workflow_id: 'wf-new-4',
      last_checkpoint_id: 'cp-new-4',
      pending_decision_wait: wait,
      retry_lineage: {
        parent_workflow_id: 'wf-new-4',
        current_attempt: 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: ['cp-new-4'],
      },
      execution_context: {
        specialist_role: 'builder',
        classified_phase: 'build',
        confidence: 0.8,
        trace_visibility: 'hidden',
        retry_safe: true,
      },
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createRetryStatefulManagers({ companyState: initialState }, dir);

    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent(),
      delegate: () => null,
    };
    const delegationState = new DelegationStateManager();

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-retry' },
      { message: null, parts: [{ type: 'text', text: 'retry' }] }
    );

    const state = statefulManagers.workspaceState.company.read();
    expect(state?.current_attempt).toBe(1);
    expect(state?.visible_context?.status_summary).toContain('stale');
  });
});

describe('createPluginInterface — canonical resume and gate approval handling (04-04)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function makeTempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'gstack-pi-resume-test-'));
    tempDirs.push(dir);
    return dir;
  }

  const multiAgentCompanyConfig = GstackConfigSchema.parse({
    orchestration_mode: 'multi-agent',
    agent_surface: { mode: 'company' },
  }) as GstackConfig;

  const makeClassifiedIntent = (
    overrides: Partial<ReturnType<Orchestrator['classify']>> = {}
  ): ReturnType<Orchestrator['classify']> => ({
    phase: 'build',
    confidence: 0.82,
    suggestedAgent: 'builder',
    suggestedSkills: ['implement'],
    reasoning: 'Resume saved Company workflow',
    ...overrides,
  });

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

  const mockHookRegistry: HookRegistry = {
    register: () => {},
    dispatch: async () => {},
    getHandlerCount: () => 0,
  };

  const makeCompanyState = (overrides: Partial<CompanyState> = {}): CompanyState => ({
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: '2026-04-09T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    session_ids: ['sess-resume'],
    workflow_id: 'wf-resume-1',
    current_attempt: 1,
    current_phase: 'build',
    visible_context: {
      current_goal: 'Implement the saved build task',
      current_step: 'Paused at a safe checkpoint',
      status_summary: 'The Company preserved the workflow before pause.',
      deferred_request_text: 'Implement the saved build task',
    },
    execution_context: {
      specialist_role: 'builder',
      classified_phase: 'build',
      confidence: 0.82,
      trace_visibility: 'hidden',
      retry_safe: true,
      deferred_classified_intent: {
        phase: 'build',
        confidence: 0.82,
        suggested_agent: 'builder',
        suggested_skills: ['implement'],
        reasoning: 'Resume saved Company workflow',
      },
    },
    retry_lineage: {
      parent_workflow_id: 'wf-resume-1',
      current_attempt: 1,
      child_attempt_ids: [],
      safe_retry_checkpoint_ids: ['cp-safe-1'],
    },
    ownership: COMPANY_ARTIFACT_OWNERSHIP,
    ...overrides,
  });

  function createStatefulManagers(
    options?: { companyState?: CompanyState | null },
    directory?: string
  ): Managers {
    let companyState = options?.companyState ?? null;
    const checkpoints: CompanyCheckpoint[] = [];

    return {
      configHandler: async (): Promise<void> => {},
      skillMcpManager: {
        disconnectSession: async (): Promise<void> => {},
        disconnectAll: async (): Promise<void> => {},
      } as unknown as Managers['skillMcpManager'],
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
          read: () => companyState,
          readResolved: () => companyState,
          write: (state: CompanyState) => {
            companyState = state;
            if (directory) {
              writeCompanyState(directory, state);
            }
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
            if (!companyState) return false;
            companyState = { ...companyState, pending_decision_wait: wait };
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
          resolveDecisionWait: (waitId: string, answer: string) => {
            if (
              !companyState?.pending_decision_wait ||
              companyState.pending_decision_wait.id !== waitId
            ) {
              return false;
            }
            companyState = {
              ...companyState,
              pending_decision_wait: {
                ...companyState.pending_decision_wait,
                status: 'answered',
                answer,
                answered_at: new Date().toISOString(),
              },
            };
            if (directory) {
              writeCompanyState(directory, companyState);
            }
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
                { ...companyState.pending_decision_wait!, status: 'archived' },
              ],
            };
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
          registerSafeRetryCheckpoint: (checkpointId: string) => {
            if (!companyState?.retry_lineage) return false;
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
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
          recordRetryAttempt: (checkpointId: string) => {
            if (!companyState?.retry_lineage) return false;
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
            if (directory) {
              writeCompanyState(directory, companyState);
            }
            return true;
          },
        },
      },
      analytics: {} as unknown as Managers['analytics'],
    };
  }

  it('fresh-session resume produces a Company resume offer instead of fresh classification', async () => {
    const dir = makeTempDir();
    const checkpointState = makeCompanyState({
      last_checkpoint_id: 'cp-safe-1',
      retry_lineage: {
        parent_workflow_id: 'wf-resume-1',
        current_attempt: 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: ['cp-safe-1'],
      },
    });
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-safe-1',
      pending_decision_wait: undefined,
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);
    statefulManagers.workspaceState.company.writeCheckpoint?.({
      id: 'cp-safe-1',
      captured_at: '2026-04-09T00:05:00.000Z',
      state: checkpointState,
      reason: 'session.deleted',
    });

    let classifyCalls = 0;
    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => {
        classifyCalls += 1;
        return makeClassifiedIntent();
      },
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-resume' },
      { message: null, parts: [{ type: 'text', text: 'resume' }] }
    );

    expect(classifyCalls).toBe(0);
    expect(delegateCalls).toBe(0);
    const pending = delegationState.getPendingContext('sess-resume');
    expect(pending?.source).toBe('resume');
    expect(pending?.approvalAction).toBe('offer-resume');
    expect(statefulManagers.workspaceState.company.read()?.pending_decision_wait?.kind).toBe(
      'resume'
    );
  });

  it('accepting a resume offer resumes the same workflow using deferred intent and latest safe checkpoint', async () => {
    const dir = makeTempDir();
    const resumeWait = createDecisionWait({
      workflowId: 'wf-resume-1',
      checkpointId: 'cp-safe-1',
      question: 'Resume the saved workflow?',
      phase: 'build',
      kind: 'resume',
      resolution_action: 'offer-resume',
    });
    const checkpointState = makeCompanyState({
      last_checkpoint_id: 'cp-safe-1',
      pending_decision_wait: undefined,
      visible_context: {
        current_goal: 'Implement the saved build task',
        current_step: 'Ready to resume build execution',
        status_summary: 'Paused at safe checkpoint',
        deferred_request_text: 'Implement the saved build task',
      },
    });
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-safe-1',
      pending_decision_wait: resumeWait,
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);
    statefulManagers.workspaceState.company.writeCheckpoint?.({
      id: 'cp-safe-1',
      captured_at: '2026-04-09T00:05:00.000Z',
      state: checkpointState,
      reason: 'session.deleted',
    });

    let delegateCalls = 0;
    const orchestrationResult = {
      agent: builderAgent,
      skills: [implementSkill],
      phase: 'build' as const,
      reasoning: 'Delegated resumed build work',
    };
    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent(),
      delegate: () => {
        delegateCalls += 1;
        return orchestrationResult;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-resume', {
      prompt: 'Resume the saved workflow?',
      kind: 'approval',
      phase: 'build',
      workflowId: 'wf-resume-1',
      checkpointId: 'cp-safe-1',
      pendingWaitId: resumeWait.id,
      requestText: 'Implement the saved build task',
      deferredIntent: makeClassifiedIntent(),
      source: 'resume',
      approvalAction: 'offer-resume',
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-resume' },
      { message: null, parts: [{ type: 'text', text: 'yes' }] }
    );

    expect(delegateCalls).toBe(1);
    expect(delegationState.getPendingContext('sess-resume')).toBeNull();
    expect(delegationState.getDelegation('sess-resume')?.phase).toBe('build');
    expect(
      statefulManagers.workspaceState.company.read()?.visible_context?.status_summary
    ).toContain('build phase');
  });

  it('accepting a gate approval clears the wait and continues without duplicate delegation work', async () => {
    const dir = makeTempDir();
    const gateWait = createDecisionWait({
      workflowId: 'wf-resume-1',
      checkpointId: 'cp-gate-1',
      question: 'Approve the gate recommendation?',
      phase: 'review',
      kind: 'approval',
      resolution_action: 'continue-same-workflow',
    });
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-gate-1',
      pending_decision_wait: gateWait,
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);

    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => makeClassifiedIntent(),
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-resume', {
      prompt: 'Approve the gate recommendation?',
      kind: 'approval',
      phase: 'review',
      workflowId: 'wf-resume-1',
      checkpointId: 'cp-gate-1',
      pendingWaitId: gateWait.id,
      requestText: 'Implement the saved build task',
      deferredIntent: makeClassifiedIntent({ phase: 'review', suggestedAgent: 'reviewer' }),
      source: 'gate',
      approvalAction: 'continue-same-workflow',
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-resume' },
      { message: null, parts: [{ type: 'text', text: 'yes' }] }
    );

    expect(delegateCalls).toBe(0);
    expect(delegationState.getPendingContext('sess-resume')).toBeNull();
    expect(statefulManagers.workspaceState.company.read()?.pending_decision_wait).toBeUndefined();
    expect(
      statefulManagers.workspaceState.company.read()?.visible_context?.status_summary
    ).toContain('continued the same workflow');
  });

  it('rejecting a resume offer keeps the workflow paused and asks for a fresh confirmed direction', async () => {
    const dir = makeTempDir();
    const resumeWait = createDecisionWait({
      workflowId: 'wf-resume-1',
      checkpointId: 'cp-safe-1',
      question: 'Resume the saved workflow?',
      phase: 'build',
      kind: 'resume',
      resolution_action: 'offer-resume',
    });
    const initialState = makeCompanyState({
      last_checkpoint_id: 'cp-safe-1',
      pending_decision_wait: resumeWait,
    });
    writeCompanyState(dir, initialState);

    const statefulManagers = createStatefulManagers({ companyState: initialState }, dir);

    let classifyCalls = 0;
    let delegateCalls = 0;
    const orchestrator: Orchestrator = {
      classify: () => {
        classifyCalls += 1;
        return makeClassifiedIntent();
      },
      delegate: () => {
        delegateCalls += 1;
        return null;
      },
    };
    const delegationState = new DelegationStateManager();
    delegationState.setPendingContext('sess-resume', {
      prompt: 'Resume the saved workflow?',
      kind: 'approval',
      phase: 'build',
      workflowId: 'wf-resume-1',
      checkpointId: 'cp-safe-1',
      pendingWaitId: resumeWait.id,
      requestText: 'Implement the saved build task',
      deferredIntent: makeClassifiedIntent(),
      source: 'resume',
      approvalAction: 'offer-resume',
    });

    const pi = createPluginInterface({
      ctx: { directory: dir },
      pluginConfig: multiAgentCompanyConfig,
      managers: statefulManagers,
      hooks: mockHookRegistry,
      tools: {},
      orchestrator,
      delegationState,
      skills: [],
      agents: [],
    });

    const chatHandler = pi['chat.message'] as Function;
    await chatHandler(
      { sessionID: 'sess-resume' },
      { message: null, parts: [{ type: 'text', text: 'no' }] }
    );

    expect(classifyCalls).toBe(0);
    expect(delegateCalls).toBe(0);
    expect(delegationState.getPendingContext('sess-resume')).toBeNull();
    expect(
      statefulManagers.workspaceState.company.read()?.visible_context?.status_summary
    ).toContain('fresh direction');
  });
});
