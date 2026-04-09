import type { SprintPhase } from '../../types/agent.ts';
import type { DelegationResult } from './delegation-engine.ts';
import type { ClassifiedIntent } from './types.ts';

export interface PendingCompanyContext {
  prompt: string;
  kind: 'ask' | 'confirm' | 'approval';
  phase: SprintPhase;
  workflowId?: string;
  checkpointId?: string;
  pendingWaitId?: string;
  clarificationStallCount?: number;
  alternativePhases?: SprintPhase[];
  requestText: string;
  deferredIntent: ClassifiedIntent;
  source?: 'gate' | 'plugin-interface';
  approvalAction?: 'continue-same-workflow';
}

export class DelegationStateManager {
  private sessionStates: Map<string, DelegationResult> = new Map();
  private pendingContexts: Map<string, PendingCompanyContext> = new Map();

  setDelegation(sessionId: string, result: DelegationResult): void {
    this.sessionStates.set(sessionId, result);
  }

  getDelegation(sessionId: string): DelegationResult | null {
    return this.sessionStates.get(sessionId) ?? null;
  }

  setPendingContext(sessionId: string, context: PendingCompanyContext): void {
    this.pendingContexts.set(sessionId, context);
  }

  getPendingContext(sessionId: string): PendingCompanyContext | null {
    return this.pendingContexts.get(sessionId) ?? null;
  }

  clearPendingContext(sessionId: string): void {
    this.pendingContexts.delete(sessionId);
  }

  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
    this.pendingContexts.delete(sessionId);
  }

  clearAll(): void {
    this.sessionStates.clear();
    this.pendingContexts.clear();
  }
}
