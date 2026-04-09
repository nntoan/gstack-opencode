import { describe, it, expect } from 'vitest';
import { createScorecardHook } from './scorecard-hook.ts';
import { createDelegationContextHook } from './delegation-context-hook.ts';
import { createSprintLogHook } from './sprint-log-hook.ts';
import { createSkillUsageHook } from './skill-usage-hook.ts';
import { createSessionTrackingHook } from './session-tracking-hook.ts';
import type {
  BoulderState,
  PlanProgress,
  ReviewDashboardEntry,
  SessionRecord,
} from '../workspace-state/index.ts';
import type { ShipReadiness } from '../workspace-state/review-dashboard.ts';
import type { DelegationResult } from '../orchestrator/index.ts';
import type { GstackAgent, SprintPhase } from '../../types/agent.ts';
import type { SkillUsageEvent, SprintLogEvent } from '../analytics/index.ts';
import type { BuiltinSkill } from '../../types/skill.ts';
import { COMPANY_ARTIFACT_OWNERSHIP } from '../company/types.ts';

// --- Fakes ---

function makeSkill(name: string): BuiltinSkill {
  return { name, description: '', template: '' };
}

function makeAgent(role: string = 'builder', phase: SprintPhase = 'build'): GstackAgent {
  return {
    role: role as GstackAgent['role'],
    name: role,
    description: '',
    sprintPhase: phase,
    skills: [],
    instructions: '',
  };
}

function makeDelegation(
  phase: SprintPhase = 'build',
  role: string = 'builder',
  skills: BuiltinSkill[] = []
): DelegationResult {
  return {
    agent: makeAgent(role, phase),
    skills,
    phase,
    reasoning: 'test',
  };
}

interface FakeAnalyticsOpts {
  recentSkills?: SkillUsageEvent[];
  phaseHistory?: SprintLogEvent[];
  loggedEvents?: SprintLogEvent[];
  recordedUsage?: SkillUsageEvent[];
}

function makeFakeAnalytics(opts: FakeAnalyticsOpts = {}) {
  const loggedEvents: SprintLogEvent[] = opts.loggedEvents ?? [];
  const phaseHistory: SprintLogEvent[] = opts.phaseHistory ?? [];
  const recordedUsage: SkillUsageEvent[] = opts.recordedUsage ?? [];
  return {
    skillUsage: {
      record: (event: SkillUsageEvent) => {
        recordedUsage.push(event);
      },
      getRecent: (_limit: number): SkillUsageEvent[] => opts.recentSkills ?? [],
    },
    eureka: {
      record: () => {},
      getInsights: () => [],
    },
    sprintLog: {
      log: (event: SprintLogEvent) => {
        loggedEvents.push(event);
      },
      getPhaseHistory: (): SprintLogEvent[] => phaseHistory,
    },
    tokenEfficiency: {
      track: async () => {},
      getReport: async () => ({
        period: { start: 0, end: 0 },
        bySkill: {},
        rawConversation: { totalTokens: 0, avgTokensPerMessage: 0, messageCount: 0 },
        efficiencyRatio: 0,
      }),
    },
    loggedEvents,
    recordedUsage,
  };
}

interface FakeWorkspaceStateOpts {
  boulderState?: BoulderState | null;
  progress?: PlanProgress;
  reviews?: ReviewDashboardEntry[];
  shipReadiness?: ShipReadiness;
  startedSessions?: SessionRecord[];
}

function makeFakeWorkspaceState(opts: FakeWorkspaceStateOpts = {}) {
  const reviews: ReviewDashboardEntry[] = opts.reviews ?? [];
  const readiness: ShipReadiness = opts.shipReadiness ?? { ready: false, missing: ['eng:passed'] };
  const progress: PlanProgress = opts.progress ?? { total: 5, completed: 2, isComplete: false };
  const boulderState = opts.boulderState === undefined ? null : opts.boulderState;
  const startedSessions: SessionRecord[] = opts.startedSessions ?? [];

  return {
    boulder: {
      read: () => boulderState,
      write: (_s: BoulderState) => true,
      append: () => null,
      clear: () => true,
      upsert: () => null,
    },
    plans: {
      getProgress: (_planPath: string): PlanProgress => progress,
      getName: (_planPath: string) => 'test-plan',
      find: () => [],
    },
    sessions: {
      start: async (
        sessionId: string,
        phase: SessionRecord['phase'],
        agent: string
      ): Promise<SessionRecord> => {
        const record: SessionRecord = {
          sessionId,
          startedAt: new Date().toISOString(),
          phase,
          agent,
          status: 'active',
        };
        startedSessions.push(record);
        return record;
      },
      complete: async (): Promise<SessionRecord | null> => null,
      getActive: async (): Promise<SessionRecord[]> =>
        startedSessions.filter((r) => r.status === 'active'),
      cleanup: async (): Promise<number> => 0,
    },
    reviews: {
      record: async (): Promise<ReviewDashboardEntry[]> => reviews,
      getStatus: async (): Promise<ReviewDashboardEntry[]> => reviews,
      isShipReady: async (): Promise<ShipReadiness> => readiness,
    },
    notepads: () => ({
      write: async () => {},
      read: async () => '',
      list: async () => [] as string[],
    }),
    ensureDir: () => {},
    company: {
      read: () => null,
      readResolved: () => {
        if (boulderState !== null) {
          return {
            version: 1 as const,
            visible_agent: 'company' as const,
            source: 'legacy-boulder' as const,
            started_at: boulderState.started_at,
            updated_at: new Date().toISOString(),
            session_ids: [...boulderState.session_ids],
            active_plan: boulderState.active_plan,
            plan_name: boulderState.plan_name,
            current_phase: boulderState.current_phase,
            active_specialist: boulderState.agent,
            ownership: COMPANY_ARTIFACT_OWNERSHIP,
          };
        }
        return null;
      },
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
    startedSessions,
  };
}

function makeFakeDelegationState(delegations?: Map<string, DelegationResult>) {
  const map = delegations ?? new Map<string, DelegationResult>();
  return {
    getDelegation: (sessionId: string): DelegationResult | null => map.get(sessionId) ?? null,
    setDelegation: (sessionId: string, result: DelegationResult) => {
      map.set(sessionId, result);
    },
    clearSession: (sessionId: string) => {
      map.delete(sessionId);
    },
    clearAll: () => {
      map.clear();
    },
  };
}

// --- Scorecard Hook Tests ---

describe('createScorecardHook', () => {
  it('has correct name and event', () => {
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      analytics: makeFakeAnalytics() as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    expect(hook.name).toBe('quality-scorecard');
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when output has no system array', async () => {
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      analytics: makeFakeAnalytics() as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    const output = {};
    await hook.handler({}, output);
    expect(output).toEqual({});
  });

  it('does nothing when no reviews, no skills, no phase history', async () => {
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState({ reviews: [] }) as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      analytics: makeFakeAnalytics({ recentSkills: [], phaseHistory: [] }) as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    // reviews empty but readiness returns { ready: false, missing: ['eng:passed'] }
    // so ship blockers section fires — check it's present
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('Ship Blockers');
  });

  it('injects review data when reviews exist', async () => {
    const reviews: ReviewDashboardEntry[] = [
      {
        reviewType: 'eng',
        status: 'passed',
        reviewer: 'alice',
        timestamp: new Date().toISOString(),
      },
    ];
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState({
        reviews,
        shipReadiness: { ready: true, missing: [] },
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      analytics: makeFakeAnalytics() as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(1);
    const scorecard = output.system[0];
    expect(scorecard).toContain('## Quality Scorecard');
    expect(scorecard).toContain('eng: passed');
    expect(scorecard).toContain('alice');
    expect(scorecard).toContain('Ready to ship');
  });

  it('injects ship blockers when not ready to ship', async () => {
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState({
        reviews: [],
        shipReadiness: { ready: false, missing: ['eng:passed'] },
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      analytics: makeFakeAnalytics({ recentSkills: [], phaseHistory: [] }) as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system[0]).toContain('Ship Blockers');
    expect(output.system[0]).toContain('eng:passed');
  });

  it('injects recent skill usage', async () => {
    const recentSkills: SkillUsageEvent[] = [
      {
        timestamp: new Date().toISOString(),
        skillName: 'build-skill',
        duration: 100,
        success: true,
        version: '1',
      },
      {
        timestamp: new Date().toISOString(),
        skillName: 'test-skill',
        duration: 200,
        success: false,
        version: '1',
      },
    ];
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState({
        reviews: [],
        shipReadiness: { ready: false, missing: [] },
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      analytics: makeFakeAnalytics({ recentSkills }) as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    const scorecard = output.system[0];
    expect(scorecard).toContain('Recent Skills');
    expect(scorecard).toContain('build-skill (ok)');
    expect(scorecard).toContain('test-skill (fail)');
  });

  it('injects phase trail from sprint log history', async () => {
    const phaseHistory: SprintLogEvent[] = [
      { timestamp: new Date().toISOString(), phase: 'think', action: 'started' },
      { timestamp: new Date().toISOString(), phase: 'think', action: 'completed' },
      { timestamp: new Date().toISOString(), phase: 'plan', action: 'started' },
    ];
    const hook = createScorecardHook({
      workspaceState: makeFakeWorkspaceState({
        reviews: [],
        shipReadiness: { ready: false, missing: [] },
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      analytics: makeFakeAnalytics({ phaseHistory }) as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    const scorecard = output.system[0];
    expect(scorecard).toContain('Phase Trail');
    expect(scorecard).toContain('think:started');
    expect(scorecard).toContain('plan:started');
  });
});

// --- Delegation Context Hook Tests ---

describe('createDelegationContextHook', () => {
  it('has correct name and event', () => {
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    expect(hook.name).toBe('delegation-context-enricher');
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when no sessionID', async () => {
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({}, output);
    expect(output.system).toHaveLength(0);
  });

  it('does nothing when no delegation for session', async () => {
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(0);
  });

  it('warns about missing reviews in ship phase', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('ship'));
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState({
        shipReadiness: { ready: false, missing: ['eng:passed'] },
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('## Delegation Context');
    expect(output.system[0]).toContain('Cannot ship yet');
    expect(output.system[0]).toContain('eng:passed');
  });

  it('does not warn in ship phase when reviews have passed', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('ship'));
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState({
        shipReadiness: { ready: true, missing: [] },
        boulderState: null,
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(0);
  });

  it('suggests shipping in build phase when reviews have passed', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState({
        shipReadiness: { ready: true, missing: [] },
        boulderState: null,
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('consider shipping');
  });

  it('reminds about active plan with incomplete tasks', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const hook = createDelegationContextHook({
      workspaceState: makeFakeWorkspaceState({
        shipReadiness: { ready: false, missing: ['eng:passed'] },
        boulderState: {
          active_plan: '/path/plan.md',
          started_at: new Date().toISOString(),
          session_ids: [],
          plan_name: 'Sprint Plan',
        },
        progress: { total: 5, completed: 2, isComplete: false },
      }) as ReturnType<typeof import('../workspace-state/index.ts').createWorkspaceState>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    const output = { system: [] as string[] };
    await hook.handler({ sessionID: 'sess-1' }, output);
    expect(output.system).toHaveLength(1);
    expect(output.system[0]).toContain('Sprint Plan');
    expect(output.system[0]).toContain('2/5');
    expect(output.system[0]).toContain('Focus on completing plan tasks');
  });
});

// --- Sprint Log Hook Tests ---

describe('createSprintLogHook', () => {
  it('has correct name and event', () => {
    const hook = createSprintLogHook({
      analytics: makeFakeAnalytics() as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    expect(hook.name).toBe('sprint-log-tracker');
    expect(hook.event).toBe('system.transform');
  });

  it('does nothing when sessionID is absent', async () => {
    const analytics = makeFakeAnalytics();
    const hook = createSprintLogHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({}, {});
    expect(analytics.loggedEvents).toHaveLength(0);
  });

  it('does nothing when no delegation for session', async () => {
    const analytics = makeFakeAnalytics();
    const hook = createSprintLogHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.loggedEvents).toHaveLength(0);
  });

  it('logs started event on first delegation', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder'));
    const hook = createSprintLogHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.loggedEvents).toHaveLength(1);
    expect(analytics.loggedEvents[0].phase).toBe('build');
    expect(analytics.loggedEvents[0].action).toBe('started');
    expect(analytics.loggedEvents[0].agent).toBe('builder');
  });

  it('does not log when phase has not changed', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build'));
    const hook = createSprintLogHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    // First call — logs started
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.loggedEvents).toHaveLength(1);
    // Second call — same phase, no new log
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.loggedEvents).toHaveLength(1);
  });

  it('logs completed and started events on phase transition', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder'));
    const hook = createSprintLogHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    // First call in build phase
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.loggedEvents).toHaveLength(1);

    // Change phase to review
    delegations.set('sess-1', makeDelegation('review', 'reviewer'));
    await hook.handler({ sessionID: 'sess-1' }, {});

    // Should have: build:started, build:completed, review:started
    expect(analytics.loggedEvents).toHaveLength(3);
    expect(analytics.loggedEvents[0].phase).toBe('build');
    expect(analytics.loggedEvents[0].action).toBe('started');
    expect(analytics.loggedEvents[1].phase).toBe('build');
    expect(analytics.loggedEvents[1].action).toBe('completed');
    expect(analytics.loggedEvents[2].phase).toBe('review');
    expect(analytics.loggedEvents[2].action).toBe('started');
  });
});

// --- Skill Usage Hook Tests ---

describe('createSkillUsageHook', () => {
  it('has correct name and event', () => {
    const hook = createSkillUsageHook({
      analytics: makeFakeAnalytics() as ReturnType<
        typeof import('../analytics/index.ts').createAnalytics
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    expect(hook.name).toBe('skill-usage-recorder');
    expect(hook.event).toBe('chat.message');
  });

  it('does nothing when sessionID is absent', async () => {
    const analytics = makeFakeAnalytics();
    const hook = createSkillUsageHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({}, {});
    expect(analytics.recordedUsage).toHaveLength(0);
  });

  it('does nothing when no delegation for session', async () => {
    const analytics = makeFakeAnalytics();
    const hook = createSkillUsageHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.recordedUsage).toHaveLength(0);
  });

  it('does nothing when delegation has no skills', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder', []));
    const hook = createSkillUsageHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.recordedUsage).toHaveLength(0);
  });

  it('records one event per skill in delegation', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set(
      'sess-1',
      makeDelegation('build', 'builder', [makeSkill('build-skill'), makeSkill('test-skill')])
    );
    const hook = createSkillUsageHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.recordedUsage).toHaveLength(2);
    expect(analytics.recordedUsage[0].skillName).toBe('build-skill');
    expect(analytics.recordedUsage[1].skillName).toBe('test-skill');
  });

  it('records events with correct shape', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('plan', 'planner', [makeSkill('plan-skill')]));
    const hook = createSkillUsageHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(analytics.recordedUsage).toHaveLength(1);
    const event = analytics.recordedUsage[0];
    expect(event.skillName).toBe('plan-skill');
    expect(event.duration).toBe(0);
    expect(event.success).toBe(true);
    expect(event.phase).toBe('plan');
    expect(event.version).toBe('0.7.0');
    expect(typeof event.timestamp).toBe('string');
  });

  it('records for multiple different sessions independently', async () => {
    const analytics = makeFakeAnalytics();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder', [makeSkill('s1')]));
    delegations.set(
      'sess-2',
      makeDelegation('review', 'reviewer', [makeSkill('s2'), makeSkill('s3')])
    );
    const hook = createSkillUsageHook({
      analytics: analytics as ReturnType<typeof import('../analytics/index.ts').createAnalytics>,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    await hook.handler({ sessionID: 'sess-2' }, {});
    expect(analytics.recordedUsage).toHaveLength(3);
  });
});

// --- Session Tracking Hook Tests ---

describe('createSessionTrackingHook', () => {
  it('has correct name and event', () => {
    const hook = createSessionTrackingHook({
      workspaceState: makeFakeWorkspaceState() as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    expect(hook.name).toBe('session-tracking');
    expect(hook.event).toBe('chat.message');
  });

  it('does nothing when sessionID is absent', async () => {
    const ws = makeFakeWorkspaceState();
    const hook = createSessionTrackingHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({}, {});
    expect(ws.startedSessions).toHaveLength(0);
  });

  it('does nothing when no delegation for session', async () => {
    const ws = makeFakeWorkspaceState();
    const hook = createSessionTrackingHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState:
        makeFakeDelegationState() as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.startedSessions).toHaveLength(0);
  });

  it('starts session on first delegation', async () => {
    const ws = makeFakeWorkspaceState();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder'));
    const hook = createSessionTrackingHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.startedSessions).toHaveLength(1);
    expect(ws.startedSessions[0].sessionId).toBe('sess-1');
    expect(ws.startedSessions[0].phase).toBe('build');
    expect(ws.startedSessions[0].agent).toBe('builder');
  });

  it('does not start session twice for the same sessionID', async () => {
    const ws = makeFakeWorkspaceState();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder'));
    const hook = createSessionTrackingHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    await hook.handler({ sessionID: 'sess-1' }, {});
    expect(ws.startedSessions).toHaveLength(1);
  });

  it('starts separate sessions for different sessionIDs', async () => {
    const ws = makeFakeWorkspaceState();
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-1', makeDelegation('build', 'builder'));
    delegations.set('sess-2', makeDelegation('review', 'reviewer'));
    const hook = createSessionTrackingHook({
      workspaceState: ws as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    await hook.handler({ sessionID: 'sess-1' }, {});
    await hook.handler({ sessionID: 'sess-2' }, {});
    expect(ws.startedSessions).toHaveLength(2);
    expect(ws.startedSessions[0].sessionId).toBe('sess-1');
    expect(ws.startedSessions[1].sessionId).toBe('sess-2');
  });

  it('handles errors from sessions.start gracefully', async () => {
    const delegations = new Map<string, DelegationResult>();
    delegations.set('sess-err', makeDelegation('build', 'builder'));
    const fakeWsWithError = {
      ...makeFakeWorkspaceState(),
      sessions: {
        start: async (): Promise<SessionRecord> => {
          throw new Error('disk full');
        },
        complete: async (): Promise<SessionRecord | null> => null,
        getActive: async (): Promise<SessionRecord[]> => [],
        cleanup: async (): Promise<number> => 0,
      },
    };
    const hook = createSessionTrackingHook({
      workspaceState: fakeWsWithError as ReturnType<
        typeof import('../workspace-state/index.ts').createWorkspaceState
      >,
      delegationState: makeFakeDelegationState(
        delegations
      ) as unknown as import('../orchestrator/index.ts').DelegationStateManager,
    });
    // Should not throw
    await expect(hook.handler({ sessionID: 'sess-err' }, {})).resolves.toBeUndefined();
  });
});
