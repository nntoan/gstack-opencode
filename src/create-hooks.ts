import type { GstackConfig } from './types/config.ts';
import type { Managers } from './create-managers.ts';
import type { HookRegistry } from './types/hooks.ts';
import type { SprintPhase } from './types/agent.ts';
import type { DelegationStateManager } from './features/orchestrator/index.ts';
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

export function createHooks(params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
  delegationState: DelegationStateManager;
}): HookRegistry {
  const { pluginConfig, delegationState } = params;
  const registry = createHookRegistry();

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
      getSessionMetadata: () => ({}), // metadata tracking not yet implemented
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

  return registry;
}
