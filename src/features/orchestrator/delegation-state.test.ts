import { describe, it, expect } from 'vitest';
import { DelegationStateManager } from './delegation-state.ts';
import type { DelegationResult } from './delegation-engine.ts';
import type { GstackAgent } from '../../types/agent.ts';
import type { BuiltinSkill } from '../../types/skill.ts';
import type { ClassifiedIntent } from './types.ts';

const makeAgent = (role: string): GstackAgent => ({
  role: role as GstackAgent['role'],
  name: role,
  description: `${role} agent`,
  sprintPhase: 'build',
  skills: [],
  instructions: '',
});

const makeSkill = (name: string): BuiltinSkill => ({
  name,
  description: `${name} skill`,
  template: '',
});

const makeDelegation = (agentRole: string, phase = 'build'): DelegationResult => ({
  agent: makeAgent(agentRole),
  skills: [makeSkill('implement')],
  phase: phase as DelegationResult['phase'],
  reasoning: 'Test reasoning',
});

const makeDeferredIntent = (phase = 'build'): ClassifiedIntent => ({
  phase: phase as ClassifiedIntent['phase'],
  confidence: 0.4,
  suggestedAgent: 'builder',
  suggestedSkills: ['implement'],
  reasoning: 'No strong pattern match, defaulting to build',
});

describe('DelegationStateManager', () => {
  it('returns null for unknown session', () => {
    const manager = new DelegationStateManager();
    expect(manager.getDelegation('unknown-session')).toBeNull();
  });

  it('stores and retrieves a delegation result', () => {
    const manager = new DelegationStateManager();
    const result = makeDelegation('builder');
    manager.setDelegation('session-1', result);
    expect(manager.getDelegation('session-1')).toBe(result);
  });

  it('overwrites existing delegation for the same session', () => {
    const manager = new DelegationStateManager();
    const first = makeDelegation('builder');
    const second = makeDelegation('reviewer');
    manager.setDelegation('session-1', first);
    manager.setDelegation('session-1', second);
    expect(manager.getDelegation('session-1')).toBe(second);
  });

  it('clearSession removes only the specified session', () => {
    const manager = new DelegationStateManager();
    manager.setDelegation('session-1', makeDelegation('builder'));
    manager.setDelegation('session-2', makeDelegation('reviewer'));
    manager.clearSession('session-1');
    expect(manager.getDelegation('session-1')).toBeNull();
    expect(manager.getDelegation('session-2')).not.toBeNull();
  });

  it('clearAll removes all sessions', () => {
    const manager = new DelegationStateManager();
    manager.setDelegation('session-1', makeDelegation('builder'));
    manager.setDelegation('session-2', makeDelegation('reviewer'));
    manager.clearAll();
    expect(manager.getDelegation('session-1')).toBeNull();
    expect(manager.getDelegation('session-2')).toBeNull();
  });

  it('handles multiple independent sessions', () => {
    const manager = new DelegationStateManager();
    const builderResult = makeDelegation('builder', 'build');
    const reviewerResult = makeDelegation('reviewer', 'review');
    manager.setDelegation('session-a', builderResult);
    manager.setDelegation('session-b', reviewerResult);
    expect(manager.getDelegation('session-a')).toBe(builderResult);
    expect(manager.getDelegation('session-b')).toBe(reviewerResult);
  });

  it('stores and retrieves pending company context for a session', () => {
    const manager = new DelegationStateManager();
    manager.setPendingContext('session-1', {
      prompt: 'I want to route this correctly.',
      kind: 'ask',
      phase: 'build',
      requestText: 'please help me',
      deferredIntent: makeDeferredIntent(),
    });

    expect(manager.getPendingContext('session-1')).toEqual({
      prompt: 'I want to route this correctly.',
      kind: 'ask',
      phase: 'build',
      requestText: 'please help me',
      deferredIntent: makeDeferredIntent(),
    });
  });

  it('returns null for unknown pending context sessions', () => {
    const manager = new DelegationStateManager();
    expect(manager.getPendingContext('unknown-session')).toBeNull();
  });

  it('clearSession removes pending context along with delegation state', () => {
    const manager = new DelegationStateManager();
    manager.setDelegation('session-1', makeDelegation('builder'));
    manager.setPendingContext('session-1', {
      prompt: 'I want to route this correctly.',
      kind: 'confirm',
      phase: 'build',
      workflowId: 'workflow-1',
      checkpointId: 'checkpoint-1',
      requestText: 'please help me',
      deferredIntent: makeDeferredIntent(),
    });

    manager.clearSession('session-1');

    expect(manager.getDelegation('session-1')).toBeNull();
    expect(manager.getPendingContext('session-1')).toBeNull();
  });

  it('clearAll removes all pending contexts', () => {
    const manager = new DelegationStateManager();
    manager.setPendingContext('session-1', {
      prompt: 'I want to route this correctly.',
      kind: 'ask',
      phase: 'build',
      requestText: 'please help me',
      deferredIntent: makeDeferredIntent(),
    });
    manager.setPendingContext('session-2', {
      prompt: 'I am ready to proceed with the **review** phase.',
      kind: 'confirm',
      phase: 'review',
      requestText: 'review this',
      deferredIntent: makeDeferredIntent('review'),
    });

    manager.clearAll();

    expect(manager.getPendingContext('session-1')).toBeNull();
    expect(manager.getPendingContext('session-2')).toBeNull();
  });

  it('preserves deferred request text and classified intent in pending context', () => {
    const manager = new DelegationStateManager();
    const deferredIntent = makeDeferredIntent('review');
    manager.setPendingContext('session-1', {
      prompt: 'I want to route this correctly.',
      kind: 'ask',
      phase: 'review',
      requestText: 'review and then ship this',
      deferredIntent,
      clarificationStallCount: 1,
      alternativePhases: ['ship'],
    });

    const stored = manager.getPendingContext('session-1');
    expect(stored?.requestText).toBe('review and then ship this');
    expect(stored?.deferredIntent).toEqual(deferredIntent);
    expect(stored?.alternativePhases).toEqual(['ship']);
  });
});
