import { randomUUID } from 'node:crypto';
import type { SprintPhase } from '../../types/agent.ts';
import type {
  HookDefinition,
  SystemTransformInput,
  SystemTransformOutput,
} from '../../types/hooks.ts';
import type { GateEngine, GateResult } from '../../types/quality-gate.ts';
import type { DelegationStateManager } from '../orchestrator/index.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import { buildCompanyBlockerPrompt } from '../company/company-blocker-prompt.ts';
import { createDecisionWait } from '../company/company-decision-wait.ts';

export function getNextPhases(current: SprintPhase): SprintPhase[] {
  const transitions: Partial<Record<SprintPhase, SprintPhase[]>> = {
    think: ['plan'],
    plan: ['build'],
    build: ['review'],
    review: ['test'],
    test: ['ship'],
  };
  return transitions[current] ?? [];
}

function buildLegacyWarnings(results: GateResult[], nextPhase: SprintPhase): string[] {
  const warnings: string[] = [];
  const blocking = results.filter((r) => r.verdict === 'block');
  const warning = results.filter((r) => r.verdict === 'warn');

  if (blocking.length > 0) {
    warnings.push(`⛔ BLOCKED: Cannot transition to ${nextPhase} phase:`);
    for (const b of blocking) warnings.push(`  - ${b.message}`);
  }
  if (warning.length > 0) {
    warnings.push(`⚠️ Before transitioning to ${nextPhase} phase:`);
    for (const w of warning) warnings.push(`  - ${w.message}`);
  }
  return warnings;
}

export function createGateHook(params: {
  gateEngine: GateEngine;
  getCurrentPhase: (sessionID: string) => SprintPhase | undefined;
  getSessionMetadata: (sessionID: string) => Record<string, unknown>;
  workspaceState?: ReturnType<typeof createWorkspaceState>;
  delegationState?: DelegationStateManager;
  companyMode?: boolean;
}): HookDefinition {
  return {
    name: 'quality-gate-checker',
    event: 'system.transform',
    handler: async (input: unknown, output: unknown): Promise<void> => {
      const typedInput = input as SystemTransformInput;
      const typedOutput = output as SystemTransformOutput;

      const sessionId = typedInput.sessionID ?? '';
      const currentPhase = params.getCurrentPhase(sessionId);
      if (!currentPhase) return;

      const nextPhases = getNextPhases(currentPhase);
      if (nextPhases.length === 0) return;

      const isCompanyMode = params.companyMode === true && params.workspaceState !== undefined;

      if (isCompanyMode) {
        const ws = params.workspaceState!;
        const ds = params.delegationState;

        for (const nextPhase of nextPhases) {
          const results = params.gateEngine.evaluate({
            fromPhase: currentPhase,
            toPhase: nextPhase,
            sessionID: sessionId,
            metadata: params.getSessionMetadata(sessionId),
          });

          const active = results.filter((r) => r.verdict === 'block' || r.verdict === 'warn');
          if (active.length === 0) continue;

          if (ds) {
            const existing = ds.getPendingContext(sessionId);
            if (existing !== null) continue;
          }

          const company = ws.company.readResolved();
          const checkpointId = randomUUID();

          ws.company.writeCheckpoint({
            id: checkpointId,
            captured_at: new Date().toISOString(),
            state: company ?? ({} as never),
            reason: 'gate-blocker',
          });

          if (company) {
            ws.company.write({
              ...company,
              last_checkpoint_id: checkpointId,
              updated_at: new Date().toISOString(),
            });
          }

          const goal =
            company?.visible_context?.current_goal ??
            company?.plan_name ??
            'Continue the active workflow';

          const prompt = buildCompanyBlockerPrompt({
            goal,
            currentStep: `${currentPhase} phase`,
            gateResults: active,
            nextPhase,
            checkpointId,
          });

          const wait = createDecisionWait({
            workflowId: company?.workflow_id ?? 'gate-workflow',
            checkpointId,
            question: prompt,
            phase: nextPhase,
            kind: 'approval',
            resolution_action: 'continue-same-workflow',
          });

          ws.company.writeDecisionWait(wait);

          if (ds) {
            const deferred = company?.execution_context?.deferred_classified_intent;
            ds.setPendingContext(sessionId, {
              prompt,
              kind: 'approval',
              phase: nextPhase,
              workflowId: company?.workflow_id,
              checkpointId,
              pendingWaitId: wait.id,
              requestText:
                company?.visible_context?.current_goal ??
                company?.plan_name ??
                'Continue the active Company workflow',
              deferredIntent: deferred
                ? {
                    phase: deferred.phase,
                    confidence: deferred.confidence,
                    suggestedAgent: deferred.suggested_agent,
                    suggestedSkills: deferred.suggested_skills,
                    reasoning: deferred.reasoning,
                  }
                : {
                    phase: nextPhase,
                    confidence: 1,
                    suggestedAgent:
                      (company?.active_specialist as import('../../types/agent.ts').AgentRole) ??
                      'builder',
                    suggestedSkills: [],
                    reasoning: 'Gate-approved continuation',
                  },
              source: 'gate',
              approvalAction: 'continue-same-workflow',
            });
          }

          typedOutput.system.push(prompt);
          return;
        }

        return;
      }

      const warnings: string[] = [];

      for (const nextPhase of nextPhases) {
        const results = params.gateEngine.evaluate({
          fromPhase: currentPhase,
          toPhase: nextPhase,
          sessionID: sessionId,
          metadata: params.getSessionMetadata(sessionId),
        });

        warnings.push(...buildLegacyWarnings(results, nextPhase));
      }

      if (warnings.length > 0) {
        typedOutput.system.push(`## Quality Gates\n\n${warnings.join('\n')}`);
      }
    },
  };
}
