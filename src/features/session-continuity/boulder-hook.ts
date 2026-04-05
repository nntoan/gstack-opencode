import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import { log } from '../../shared/logger.ts';

export function createBoulderHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  delegationState: DelegationStateManager;
}): HookDefinition {
  const { workspaceState, delegationState } = params;

  return {
    name: 'boulder-state-tracker',
    event: 'system.transform',
    handler: async (input: unknown, _output: unknown): Promise<void> => {
      const typedInput = input as { sessionID?: string };
      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return;

      try {
        const existing = workspaceState.boulder.read();
        if (!existing) return;

        // Update if phase or agent changed
        const phaseChanged = existing.current_phase !== delegation.phase;
        const agentChanged = existing.agent !== delegation.agent.role;
        if (phaseChanged || agentChanged) {
          workspaceState.boulder.write({
            ...existing,
            current_phase: delegation.phase,
            agent: delegation.agent.role,
          });
        }
        // Append session if new
        workspaceState.boulder.append(sessionId);
      } catch (err: unknown) {
        log('[ERROR] boulder-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
