import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import { log } from '../../shared/logger.ts';

export function createSessionTrackingHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  delegationState: DelegationStateManager;
}): HookDefinition {
  const { workspaceState, delegationState } = params;
  const startedSessions = new Set<string>();

  return {
    name: 'session-tracking',
    event: 'chat.message',
    handler: async (input: unknown, _output: unknown): Promise<void> => {
      const typedInput = input as { sessionID?: string };
      const sessionId = typedInput.sessionID;
      if (!sessionId) return;

      if (startedSessions.has(sessionId)) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return;

      try {
        await workspaceState.sessions.start(sessionId, delegation.phase, delegation.agent.role);
        startedSessions.add(sessionId);
      } catch (err: unknown) {
        log('[ERROR] session-tracking-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
