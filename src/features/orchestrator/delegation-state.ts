import type { DelegationResult } from './delegation-engine.ts';

export class DelegationStateManager {
  private sessionStates: Map<string, DelegationResult> = new Map();

  setDelegation(sessionId: string, result: DelegationResult): void {
    this.sessionStates.set(sessionId, result);
  }

  getDelegation(sessionId: string): DelegationResult | null {
    return this.sessionStates.get(sessionId) ?? null;
  }

  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
  }

  clearAll(): void {
    this.sessionStates.clear();
  }
}
