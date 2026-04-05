import type { HookDefinition } from '../../types/hooks.ts';
import type { Analytics } from '../analytics/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import type { SprintPhase } from '../../types/agent.ts';

export function createSprintLogHook(params: {
  analytics: Analytics;
  delegationState: DelegationStateManager;
}): HookDefinition {
  const { analytics, delegationState } = params;
  const lastPhaseBySession = new Map<string, SprintPhase>();

  return {
    name: 'sprint-log-tracker',
    event: 'system.transform',
    handler: async (input: unknown, _output: unknown): Promise<void> => {
      const typedInput = input as { sessionID?: string };
      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return;

      const lastPhase = lastPhaseBySession.get(sessionId) ?? null;
      if (delegation.phase !== lastPhase) {
        if (lastPhase) {
          analytics.sprintLog.log({
            timestamp: new Date().toISOString(),
            phase: lastPhase,
            action: 'completed',
            agent: delegation.agent.role,
          });
        }
        analytics.sprintLog.log({
          timestamp: new Date().toISOString(),
          phase: delegation.phase,
          action: 'started',
          agent: delegation.agent.role,
        });
        lastPhaseBySession.set(sessionId, delegation.phase);
      }
    },
  };
}
