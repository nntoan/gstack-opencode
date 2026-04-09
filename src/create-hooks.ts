import type { GstackConfig } from './types/config.ts';
import type { Managers } from './create-managers.ts';
import type { HookRegistry } from './types/hooks.ts';
import type { SprintPhase } from './types/agent.ts';
import type { DelegationStateManager } from './features/orchestrator/index.ts';
import type { createWorkspaceState } from './features/workspace-state/index.ts';
import {
  createHookRegistry,
  createToolOutputTruncator,
  createAgentsMdInjector,
} from './features/hooks/index.ts';
import { createInterviewModeHook } from './features/interview/index.ts';
import {
  createGateEngine,
  createDefaultGates,
  createGateHook,
} from './features/quality-gates/index.ts';
import {
  createBudgetTracker,
  createBudgetWarningHook,
  createBudgetTrackingHook,
} from './features/token-budget/index.ts';
import {
  createBoulderHook,
  createProgressHook,
  createRecoveryHook,
} from './features/session-continuity/index.ts';
import {
  createScorecardHook,
  createDelegationContextHook,
  createSprintLogHook,
  createSkillUsageHook,
  createSessionTrackingHook,
} from './features/quality-scorecard/index.ts';

export function createHooks(params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
  delegationState: DelegationStateManager;
  workspaceState: ReturnType<typeof createWorkspaceState>;
}): HookRegistry {
  const { pluginConfig, delegationState, workspaceState } = params;
  const registry = createHookRegistry();
  const isCompanyMode = (pluginConfig.agent_surface?.mode ?? 'company') === 'company';

  // --- 2D: Core infrastructure hooks ---
  registry.register(createToolOutputTruncator());
  registry.register(createAgentsMdInjector({ orchestrationMode: pluginConfig.orchestration_mode }));

  // --- Phase-aware helper ---
  const getCurrentPhase = (sessionID: string): SprintPhase | undefined => {
    const delegation = delegationState.getDelegation(sessionID);
    return delegation?.phase;
  };

  // --- 2F: Interview mode hook ---
  registry.register(createInterviewModeHook({ getCurrentPhase }));

  // --- 2A: Quality gates hook ---
  const gateEngine = createGateEngine();
  for (const gate of createDefaultGates()) {
    gateEngine.register(gate);
  }
  registry.register(
    createGateHook({
      gateEngine,
      getCurrentPhase,
      workspaceState,
      delegationState,
      companyMode: isCompanyMode,
      getSessionMetadata: (_sessionId: string) => {
        const company = workspaceState.company.readResolved();
        if (company) {
          return {
            activePlan: company.active_plan,
            planName: company.plan_name,
            currentPhase: company.current_phase,
          };
        }
        const boulder = workspaceState.boulder.read();
        if (!boulder) return {};
        return {
          activePlan: boulder.active_plan,
          planName: boulder.plan_name,
          currentPhase: boulder.current_phase,
        };
      },
    })
  );

  // --- 2B: Token budget hooks ---
  const budgetConfig = pluginConfig.token_budget;
  if (budgetConfig?.enabled) {
    const budgetTracker = createBudgetTracker({
      maxTokensPerSession: budgetConfig.max_tokens_per_session,
      warnAtPercent: budgetConfig.warn_at_percent,
    });
    registry.register(createBudgetWarningHook({ budgetTracker }));
    registry.register(createBudgetTrackingHook({ budgetTracker }));
  }

  // --- Phase 5: Session continuity hooks ---
  registry.register(
    createBoulderHook({ workspaceState, delegationState, companyMode: isCompanyMode })
  );
  registry.register(createProgressHook({ workspaceState, companyMode: isCompanyMode }));
  registry.register(
    createRecoveryHook({ workspaceState, delegationState, companyMode: isCompanyMode })
  );

  // --- Phase 6: Quality scorecard hooks ---
  registry.register(createScorecardHook({ workspaceState, analytics: params.managers.analytics }));
  registry.register(
    createDelegationContextHook({ workspaceState, delegationState, companyMode: isCompanyMode })
  );
  registry.register(createSprintLogHook({ analytics: params.managers.analytics, delegationState }));

  // --- Phase 7: Data pipeline hooks ---
  registry.register(
    createSkillUsageHook({ analytics: params.managers.analytics, delegationState })
  );
  registry.register(createSessionTrackingHook({ workspaceState, delegationState }));

  return registry;
}
