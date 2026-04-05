import type { HookDefinition } from '../../types/hooks.ts';
import type { Analytics } from '../analytics/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import type { SprintPhase } from '../../types/agent.ts';
import { log } from '../../shared/logger.ts';

export function createSkillUsageHook(params: {
  analytics: Analytics;
  delegationState: DelegationStateManager;
}): HookDefinition {
  const { analytics, delegationState } = params;
  const lastRecordedPhase = new Map<string, SprintPhase>();

  return {
    name: 'skill-usage-recorder',
    event: 'chat.message',
    handler: async (input: unknown, _output: unknown): Promise<void> => {
      const typedInput = input as { sessionID?: string };
      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return;

      // Only record when delegation phase changes (avoids re-recording on every message)
      const lastPhase = lastRecordedPhase.get(sessionId);
      if (lastPhase === delegation.phase) return;
      lastRecordedPhase.set(sessionId, delegation.phase);

      try {
        for (const skill of delegation.skills) {
          analytics.skillUsage.record({
            timestamp: new Date().toISOString(),
            skillName: skill.name,
            duration: 0,
            success: true,
            phase: delegation.phase,
            version: '0.7.0',
          });
        }
      } catch (err: unknown) {
        log('[ERROR] skill-usage-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
