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
        const nowIso = new Date().toISOString();
        const newPhase = delegation.phase;
        const newSpecialist = delegation.agent.role;

        const canonical = workspaceState.company.read();
        if (canonical !== null) {
          const phaseChanged = canonical.current_phase !== newPhase;
          const specialistChanged = canonical.active_specialist !== newSpecialist;

          if (phaseChanged || specialistChanged) {
            const updatedIds = canonical.session_ids.includes(sessionId)
              ? canonical.session_ids
              : [...canonical.session_ids, sessionId];

            workspaceState.company.write({
              ...canonical,
              current_phase: newPhase,
              active_specialist: newSpecialist,
              updated_at: nowIso,
              session_ids: updatedIds,
            });

            workspaceState.company.appendLog({
              ts: nowIso,
              event: 'phase_transition',
              data: {
                session_id: sessionId,
                from_phase: canonical.current_phase,
                to_phase: newPhase,
                from_specialist: canonical.active_specialist,
                to_specialist: newSpecialist,
              },
            });
          } else if (!canonical.session_ids.includes(sessionId)) {
            workspaceState.company.write({
              ...canonical,
              updated_at: nowIso,
              session_ids: [...canonical.session_ids, sessionId],
            });
          }
        }

        const existing = workspaceState.boulder.read();
        if (!existing) return;

        const phaseChanged = existing.current_phase !== newPhase;
        const agentChanged = existing.agent !== newSpecialist;
        if (phaseChanged || agentChanged) {
          workspaceState.boulder.write({
            ...existing,
            current_phase: newPhase,
            agent: newSpecialist,
          });
        }
        workspaceState.boulder.append(sessionId);
      } catch (err: unknown) {
        log('[ERROR] boulder-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
