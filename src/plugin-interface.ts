import { randomUUID } from 'node:crypto';
import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent, SprintPhase } from './types/agent.ts';
import type { Managers } from './create-managers.ts';
import type { Orchestrator } from './features/orchestrator/index.ts';
import type { HookRegistry } from './types/hooks.ts';
import {
  DelegationStateManager,
  buildDelegationSystemPrompt,
} from './features/orchestrator/index.ts';
import { applyAmbiguityPolicy } from './features/company/company-ambiguity-policy.ts';
import { createDecisionWait } from './features/company/company-decision-wait.ts';
import {
  archiveDecisionWaitInState,
  COMPANY_ARTIFACT_OWNERSHIP,
  getLatestSafeCheckpointId,
  markDecisionWaitStaleInState,
  recordRetryAttemptInState,
  registerDecisionAnswerInState,
  resolveDecisionWaitInState,
} from './features/company/index.ts';
import type { CompanyState, DeferredClassifiedIntent } from './features/company/index.ts';
import type { ClassifiedIntent, DelegationResult } from './features/orchestrator/index.ts';
import { log } from './shared/index.ts';

const ACCEPT_COMPANY_DECISION_REGEX = /^(yes|y|approve|approved|proceed|continue)$/i;
const REJECT_COMPANY_DECISION_REGEX = /^(no|n|reject|decline|stop|change)$/i;
const DEBUG_COMPANY_REQUEST_REGEX = /^(debug|trace|show trace|expert)$/i;
const RETRY_COMPANY_REQUEST_REGEX = /^(retry|try again|resume)$/i;

function isCompanyMode(pluginConfig: GstackConfig): boolean {
  return (pluginConfig.agent_surface?.mode ?? 'company') === 'company';
}

function getTextFromParts(parts: unknown[]): string {
  return (
    parts
      .filter((p: unknown) => (p as { type?: string }).type === 'text')
      .map(
        (p: unknown) =>
          (p as { text?: string; value?: string }).text ||
          (p as { text?: string; value?: string }).value ||
          ''
      )
      .join(' ') || ''
  );
}

function toDeferredClassifiedIntent(classified: ClassifiedIntent): DeferredClassifiedIntent {
  return {
    phase: classified.phase,
    confidence: classified.confidence,
    suggested_agent: classified.suggestedAgent,
    suggested_skills: classified.suggestedSkills,
    reasoning: classified.reasoning,
  };
}

function createBaseCompanyState(sessionId: string): CompanyState {
  const nowIso = new Date().toISOString();
  const workflowId = randomUUID();
  return {
    version: 1,
    visible_agent: 'company',
    source: 'canonical',
    started_at: nowIso,
    updated_at: nowIso,
    session_ids: sessionId ? [sessionId] : [],
    workflow_id: workflowId,
    current_attempt: 1,
    retry_lineage: {
      parent_workflow_id: workflowId,
      current_attempt: 1,
      child_attempt_ids: [],
      safe_retry_checkpoint_ids: [],
    },
    ownership: COMPANY_ARTIFACT_OWNERSHIP,
  };
}

function mergeSessionId(sessionIds: string[], sessionId: string): string[] {
  if (!sessionId || sessionIds.includes(sessionId)) {
    return sessionIds;
  }
  return [...sessionIds, sessionId];
}

function getAlternativePhases(classified: ClassifiedIntent): SprintPhase[] {
  if (!classified.reasoning.startsWith('Multiple phase matches:')) {
    return [];
  }

  return classified.reasoning
    .replace('Multiple phase matches:', '')
    .split(',')
    .map((phase) => phase.trim() as SprintPhase)
    .filter((phase) => phase.length > 0 && phase !== classified.phase);
}

function updateCompanyState(
  managers: Managers,
  sessionId: string,
  updater: (state: CompanyState) => CompanyState
): CompanyState {
  const current = managers.workspaceState.company.read() ?? createBaseCompanyState(sessionId);
  const next = updater(current);
  managers.workspaceState.company.write(next);
  return next;
}

function storePendingCompanyDecision(params: {
  managers: Managers;
  sessionId: string;
  requestText: string;
  classified: ClassifiedIntent;
  decision:
    | { action: 'ask'; questionPrompt: string }
    | { action: 'confirm'; confirmationPrompt: string };
  delegationState: DelegationStateManager;
  kind?: 'ask' | 'confirm' | 'approval';
  clarificationStallCount?: number;
  workflowId?: string;
  checkpointId?: string;
}): void {
  const { managers, sessionId, requestText, classified, decision, delegationState } = params;
  const kind = params.kind ?? decision.action;
  const prompt = decision.action === 'ask' ? decision.questionPrompt : decision.confirmationPrompt;

  const companyState = updateCompanyState(managers, sessionId, (state) => {
    const workflowId = params.workflowId ?? state.workflow_id ?? randomUUID();
    const checkpointId = params.checkpointId ?? randomUUID();

    return {
      ...state,
      workflow_id: workflowId,
      current_attempt: state.current_attempt ?? 1,
      last_checkpoint_id: checkpointId,
      session_ids: mergeSessionId(state.session_ids, sessionId),
      visible_context: {
        ...state.visible_context,
        current_goal: requestText,
        current_step: `Waiting for a ${kind === 'approval' ? 'decision' : 'clarification'} before continuing`,
        status_summary: 'The Company is paused until you answer the current routing decision.',
        pending_user_decision: prompt,
        deferred_request_text: requestText,
      },
      execution_context: {
        ...state.execution_context,
        specialist_role: classified.suggestedAgent,
        classified_phase: classified.phase,
        confidence: classified.confidence,
        trace_visibility: state.execution_context?.trace_visibility ?? 'hidden',
        deferred_classified_intent: toDeferredClassifiedIntent(classified),
      },
      retry_lineage: state.retry_lineage ?? {
        parent_workflow_id: workflowId,
        current_attempt: state.current_attempt ?? 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: [],
      },
      updated_at: new Date().toISOString(),
    };
  });

  const wait = createDecisionWait({
    workflowId: companyState.workflow_id!,
    checkpointId: companyState.last_checkpoint_id!,
    question: prompt,
    phase: classified.phase,
  });

  managers.workspaceState.company.writeDecisionWait?.(wait);

  const refreshedState = {
    ...companyState,
    pending_decision_wait: wait,
    updated_at: new Date().toISOString(),
  };
  managers.workspaceState.company.write(refreshedState);

  delegationState.setPendingContext(sessionId, {
    prompt,
    kind,
    phase: classified.phase,
    workflowId: refreshedState.workflow_id,
    checkpointId: refreshedState.last_checkpoint_id,
    pendingWaitId: wait.id,
    clarificationStallCount: params.clarificationStallCount ?? 0,
    alternativePhases: getAlternativePhases(classified),
    requestText,
    deferredIntent: classified,
  });
}

function finalizeCompanyDelegation(params: {
  managers: Managers;
  sessionId: string;
  requestText: string;
  classified: ClassifiedIntent;
  result: DelegationResult;
  delegationState: DelegationStateManager;
  workflowId?: string;
  checkpointId?: string;
}): DelegationResult {
  const checkpointId = params.checkpointId ?? randomUUID();
  const nextResult: DelegationResult = {
    ...params.result,
    visibleAgent: 'company',
    specialistRole: params.result.agent.role,
    confidence: params.classified.confidence,
    workflowId: params.workflowId,
    checkpointId,
    attempt: params.managers.workspaceState.company.read()?.current_attempt ?? 1,
  };

  const companyState = updateCompanyState(params.managers, params.sessionId, (state) => {
    const workflowId = params.workflowId ?? state.workflow_id ?? randomUUID();
    return {
      ...state,
      workflow_id: workflowId,
      current_attempt: state.current_attempt ?? 1,
      session_ids: mergeSessionId(state.session_ids, params.sessionId),
      current_phase: nextResult.phase,
      active_specialist: nextResult.agent.role,
      last_checkpoint_id: checkpointId,
      visible_context: {
        ...state.visible_context,
        current_goal: params.requestText,
        current_step: `Working through the ${nextResult.phase} phase`,
        status_summary: `The Company is handling this through the ${nextResult.phase} phase.`,
        pending_user_decision: undefined,
        deferred_request_text: params.requestText,
      },
      execution_context: {
        ...state.execution_context,
        specialist_role: nextResult.agent.role,
        classified_phase: nextResult.phase,
        confidence: params.classified.confidence,
        trace_visibility: state.execution_context?.trace_visibility ?? 'hidden',
        retry_safe: true,
        retry_reason: undefined,
        deferred_classified_intent: toDeferredClassifiedIntent(params.classified),
      },
      retry_lineage: state.retry_lineage ?? {
        parent_workflow_id: workflowId,
        current_attempt: state.current_attempt ?? 1,
        child_attempt_ids: [],
        safe_retry_checkpoint_ids: [],
      },
      pending_decision_wait: undefined,
      updated_at: new Date().toISOString(),
    };
  });

  params.managers.workspaceState.company.registerSafeRetryCheckpoint?.(checkpointId);
  params.delegationState.clearPendingContext(params.sessionId);
  params.delegationState.setDelegation(params.sessionId, {
    ...nextResult,
    workflowId: companyState.workflow_id,
    checkpointId,
    attempt: companyState.current_attempt ?? 1,
  });

  return {
    ...nextResult,
    workflowId: companyState.workflow_id,
    checkpointId,
    attempt: companyState.current_attempt ?? 1,
  };
}

export type PluginInterfaceParams = {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
  hooks: HookRegistry;
  tools: Record<string, unknown>;
  orchestrator: Orchestrator;
  delegationState: DelegationStateManager;
  skills: GstackSkill[];
  agents: GstackAgent[];
};

export function createPluginInterface(params: PluginInterfaceParams): Record<string, unknown> {
  const { ctx, managers, tools, orchestrator, pluginConfig, delegationState, hooks } = params;

  return {
    tool: tools,

    config: managers.configHandler,

    'chat.params': async (): Promise<void> => {},

    'chat.headers': async (): Promise<void> => {},

    'chat.message': async (
      input:
        | {
            sessionID?: string;
            agent?: string;
            model?: { providerID: string; modelID: string };
            messageID?: string;
            variant?: string;
          }
        | undefined,
      output: { message: unknown; parts: unknown[] } | undefined
    ): Promise<void> => {
      const parts = output?.parts ?? [];

      if (pluginConfig.orchestration_mode === 'multi-agent') {
        const text = getTextFromParts(parts);

        if (text) {
          try {
            const sessionId = input?.sessionID ?? '';
            if (isCompanyMode(pluginConfig) && sessionId) {
              const pendingContext = delegationState.getPendingContext(sessionId);
              const companyState = managers.workspaceState.company.read();
              const pendingWait = companyState?.pending_decision_wait;

              const isControlMessage =
                ACCEPT_COMPANY_DECISION_REGEX.test(text) ||
                REJECT_COMPANY_DECISION_REGEX.test(text) ||
                RETRY_COMPANY_REQUEST_REGEX.test(text);

              if (pendingWait && isControlMessage) {
                const answerKey =
                  input?.messageID?.trim() || `${pendingWait.id}:${text.trim().toLowerCase()}`;
                const registerResult = registerDecisionAnswerInState(
                  ctx.directory,
                  pendingWait.id,
                  answerKey
                );

                if (registerResult === 'duplicate') {
                  managers.workspaceState.company.write({
                    ...companyState!,
                    visible_context: {
                      ...companyState!.visible_context,
                      status_summary:
                        'The Company already recorded that answer and kept the workflow on its current path.',
                    },
                    updated_at: new Date().toISOString(),
                  });
                  return;
                }

                const isStaleSession =
                  pendingContext && pendingContext.pendingWaitId !== pendingWait.id;
                const isStaleWorkflow = pendingWait.workflow_id !== companyState?.workflow_id;
                const isStaleCheckpoint =
                  pendingWait.checkpoint_id !== companyState?.last_checkpoint_id;

                if (isStaleSession || isStaleWorkflow || isStaleCheckpoint) {
                  const staleReason = isStaleWorkflow
                    ? 'workflow-mismatch'
                    : isStaleCheckpoint
                      ? 'checkpoint-mismatch'
                      : 'session-turnover';
                  const safeCheckpointId = getLatestSafeCheckpointId(ctx.directory) ?? undefined;
                  markDecisionWaitStaleInState(
                    ctx.directory,
                    pendingWait.id,
                    staleReason,
                    safeCheckpointId
                  );
                  managers.workspaceState.company.write({
                    ...companyState!,
                    visible_context: {
                      ...companyState!.visible_context,
                      status_summary: safeCheckpointId
                        ? `That answer is stale — the workflow has moved on. Resume from the latest safe checkpoint (${safeCheckpointId}) or describe a fresh direction.`
                        : 'That answer is stale — the workflow has moved on. Describe a fresh direction to continue.',
                    },
                    updated_at: new Date().toISOString(),
                  });
                  return;
                }
              }

              if (DEBUG_COMPANY_REQUEST_REGEX.test(text) && companyState) {
                managers.workspaceState.company.write({
                  ...companyState,
                  execution_context: {
                    ...companyState.execution_context,
                    trace_visibility: 'debug',
                  },
                  updated_at: new Date().toISOString(),
                });
              } else if (
                RETRY_COMPANY_REQUEST_REGEX.test(text) &&
                companyState?.execution_context?.retry_safe === true &&
                companyState.last_checkpoint_id
              ) {
                managers.workspaceState.company.recordRetryAttempt?.(
                  companyState.last_checkpoint_id
                );
                const refreshed = managers.workspaceState.company.read();
                if (refreshed) {
                  managers.workspaceState.company.write({
                    ...refreshed,
                    visible_context: {
                      ...refreshed.visible_context,
                      status_summary:
                        'The Company resumed the saved workflow from the last safe checkpoint.',
                    },
                    updated_at: new Date().toISOString(),
                  });
                }
                return;
              } else if (RETRY_COMPANY_REQUEST_REGEX.test(text) && companyState) {
                managers.workspaceState.company.write({
                  ...companyState,
                  visible_context: {
                    ...companyState.visible_context,
                    status_summary:
                      'The Company cannot retry this deterministically yet. The next safe step is to confirm the current direction or start a new clarified request.',
                  },
                  updated_at: new Date().toISOString(),
                });
                return;
              }

              if (
                pendingContext &&
                pendingWait &&
                pendingContext.pendingWaitId === pendingWait.id
              ) {
                if (REJECT_COMPANY_DECISION_REGEX.test(text)) {
                  resolveDecisionWaitInState(ctx.directory, pendingWait.id, text);
                  archiveDecisionWaitInState(ctx.directory, pendingWait.id);
                  const clarificationStallCount = (pendingContext.clarificationStallCount ?? 0) + 1;
                  const decision = applyAmbiguityPolicy(pendingContext.deferredIntent, {
                    priorDecision: 'rejected',
                    clarificationStallCount,
                    alternativePhases: pendingContext.alternativePhases,
                  });

                  if (decision.action === 'ask' || decision.action === 'confirm') {
                    storePendingCompanyDecision({
                      managers,
                      sessionId,
                      requestText: pendingContext.requestText,
                      classified: pendingContext.deferredIntent,
                      decision,
                      delegationState,
                      kind: decision.action,
                      clarificationStallCount,
                      workflowId: pendingContext.workflowId,
                    });
                  }
                } else if (
                  ACCEPT_COMPANY_DECISION_REGEX.test(text) &&
                  (pendingContext.kind === 'confirm' || pendingContext.kind === 'approval')
                ) {
                  resolveDecisionWaitInState(ctx.directory, pendingWait.id, text);
                  archiveDecisionWaitInState(ctx.directory, pendingWait.id);
                  delegationState.clearPendingContext(sessionId);

                  const result = orchestrator.delegate(pendingContext.deferredIntent);
                  if (result) {
                    const delegated = finalizeCompanyDelegation({
                      managers,
                      sessionId,
                      requestText: pendingContext.requestText,
                      classified: pendingContext.deferredIntent,
                      result,
                      delegationState,
                      workflowId: pendingContext.workflowId,
                      checkpointId: pendingContext.checkpointId,
                    });
                    log('[plugin-interface] delegated intent', {
                      phase: delegated.phase,
                      agent: delegated.agent.role,
                      skillCount: delegated.skills.length,
                    });
                  }
                } else if (pendingContext.kind === 'ask') {
                  resolveDecisionWaitInState(ctx.directory, pendingWait.id, text);
                  archiveDecisionWaitInState(ctx.directory, pendingWait.id);
                  delegationState.clearPendingContext(sessionId);
                  const clarifiedText = `${pendingContext.requestText} ${text}`.trim();
                  const clarified = orchestrator.classify(clarifiedText);
                  const decision = applyAmbiguityPolicy(clarified);

                  if (decision.action === 'delegate') {
                    const result = orchestrator.delegate(clarified);
                    if (result) {
                      const delegated = finalizeCompanyDelegation({
                        managers,
                        sessionId,
                        requestText: clarifiedText,
                        classified: clarified,
                        result,
                        delegationState,
                        workflowId: pendingContext.workflowId,
                      });
                      log('[plugin-interface] delegated intent', {
                        phase: delegated.phase,
                        agent: delegated.agent.role,
                        skillCount: delegated.skills.length,
                      });
                    }
                  } else {
                    storePendingCompanyDecision({
                      managers,
                      sessionId,
                      requestText: clarifiedText,
                      classified: clarified,
                      decision,
                      delegationState,
                      kind: decision.action,
                      workflowId: pendingContext.workflowId,
                    });
                  }
                }
              } else {
                const classified = orchestrator.classify(text);
                const decision = applyAmbiguityPolicy(classified);

                if (decision.action === 'ask' || decision.action === 'confirm') {
                  storePendingCompanyDecision({
                    managers,
                    sessionId,
                    requestText: text,
                    classified,
                    decision,
                    delegationState,
                  });
                } else {
                  const result = orchestrator.delegate(classified);
                  if (result) {
                    const delegated = finalizeCompanyDelegation({
                      managers,
                      sessionId,
                      requestText: text,
                      classified,
                      result,
                      delegationState,
                    });
                    log('[plugin-interface] delegated intent', {
                      phase: delegated.phase,
                      agent: delegated.agent.role,
                      skillCount: delegated.skills.length,
                    });
                  }
                }
              }
            } else {
              const classified = orchestrator.classify(text);
              const result = orchestrator.delegate(classified);
              if (result) {
                if (sessionId) {
                  delegationState.setDelegation(sessionId, result);
                }
                log('[plugin-interface] delegated intent', {
                  phase: result.phase,
                  agent: result.agent.role,
                  skillCount: result.skills.length,
                });
              }
            }
          } catch (err: unknown) {
            log('[plugin-interface] chat.message delegation error', {
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      // Dispatch hooks AFTER delegation so hooks see the current delegation state
      await hooks.dispatch(
        'chat.message',
        { sessionID: input?.sessionID ?? '', text: '' },
        { parts }
      );
    },

    'experimental.chat.messages.transform': async (): Promise<void> => {},

    'experimental.chat.system.transform': async (
      input: { sessionID?: string; model?: unknown } | undefined,
      output: { system: string[] } | undefined
    ): Promise<void> => {
      const safeOutput: { system: string[] } = output ?? { system: [] };
      if (!Array.isArray(safeOutput.system)) safeOutput.system = [];

      await hooks.dispatch('system.transform', { sessionID: input?.sessionID ?? '' }, safeOutput);

      const sessionId = input?.sessionID ?? '';
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (delegation) {
        const contextPrompt = buildDelegationSystemPrompt(
          delegation,
          isCompanyMode(pluginConfig) ? { mode: 'company' } : undefined
        );
        safeOutput.system.push(contextPrompt);
        return;
      }

      const pendingContext = delegationState.getPendingContext(sessionId);
      if (pendingContext) {
        safeOutput.system.push(pendingContext.prompt);
      }
    },

    event: async (input: {
      type?: string;
      properties?: { info?: { id?: string } };
    }): Promise<void> => {
      if (input?.type === 'session.deleted') {
        const sessionID = input?.properties?.info?.id;
        if (sessionID) {
          const companyState = managers.workspaceState.company.read();
          if (companyState) {
            const checkpointId = companyState.last_checkpoint_id ?? randomUUID();
            const updatedState: CompanyState = {
              ...companyState,
              last_checkpoint_id: checkpointId,
              visible_context: {
                ...companyState.visible_context,
                status_summary:
                  'The Company preserved the current workflow state before this session closed. The next safe step is to resume from the last checkpoint.',
              },
              updated_at: new Date().toISOString(),
            };
            managers.workspaceState.company.write(updatedState);
            managers.workspaceState.company.writeCheckpoint?.({
              id: checkpointId,
              captured_at: updatedState.updated_at,
              state: updatedState,
              reason: 'session.deleted',
            });
          }

          await managers.workspaceState.sessions.complete(sessionID).catch((err: unknown) => {
            log('[ERROR] session complete failed', {
              sessionID,
              error: err instanceof Error ? err.message : String(err),
            });
          });
          await managers.skillMcpManager.disconnectSession(sessionID);
          delegationState.clearSession(sessionID);
          log('[plugin-interface] disconnected MCP session', { sessionID });
        }
      }
    },

    'tool.execute.before': async (
      input: { tool: string; sessionID: string; callID: string } | undefined,
      output: { args: unknown } | undefined
    ): Promise<void> => {
      if (!input) return;
      await hooks.dispatch('tool.execute.before', input, output ?? { args: {} });
    },

    'tool.execute.after': async (
      input: { tool: string; sessionID: string; callID: string; args: unknown } | undefined,
      output: { title: string; output: string; metadata: unknown } | undefined
    ): Promise<void> => {
      if (!input) return;
      await hooks.dispatch(
        'tool.execute.after',
        input,
        output ?? { title: '', output: '', metadata: null }
      );
    },

    'tool.definition': async (): Promise<void> => {},
  };
}
