import { describe, it, expect } from 'vitest';
import { ceoAgent } from './ceo.ts';
import { engManagerAgent } from './eng-manager.ts';
import { designerAgent } from './designer.ts';
import { builderAgent } from './builder.ts';
import { reviewerAgent } from './reviewer.ts';
import { debuggerAgent } from './debugger.ts';
import type { GstackAgent } from '../types/agent.ts';

const VALID_SPRINT_PHASES = new Set([
  'think',
  'plan',
  'build',
  'review',
  'test',
  'ship',
  'reflect',
  'cross-cutting',
  'utility',
]);

function assertValidAgent(agent: GstackAgent): void {
  expect(agent.role).toBeTruthy();
  expect(agent.name).toBeTruthy();
  expect(agent.description).toBeTruthy();
  expect(VALID_SPRINT_PHASES.has(agent.sprintPhase)).toBe(true);
  expect(Array.isArray(agent.skills)).toBe(true);
  expect(typeof agent.instructions).toBe('string');
  expect(agent.instructions.length).toBeGreaterThan(50);
  expect(agent.model).toBeUndefined();
}

describe('Core Agent Definitions', () => {
  describe('CEO Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(ceoAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(ceoAgent.role).toBe('ceo');
      expect(ceoAgent.sprintPhase).toBe('think');
    });

    it('references correct skills', () => {
      expect(ceoAgent.skills).toEqual(['office-hours', 'plan-ceo-review']);
    });

    it('has no hard-coded model', () => {
      expect(ceoAgent.model).toBeUndefined();
    });

    it('is marked as subtask', () => {
      expect(ceoAgent.subtask).toBe(true);
    });
  });

  describe('Engineering Manager Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(engManagerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(engManagerAgent.role).toBe('eng-manager');
      expect(engManagerAgent.sprintPhase).toBe('plan');
    });

    it('references correct skills', () => {
      expect(engManagerAgent.skills).toEqual(['plan-eng-review']);
    });

    it('has no hard-coded model', () => {
      expect(engManagerAgent.model).toBeUndefined();
    });
  });

  describe('Designer Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(designerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(designerAgent.role).toBe('designer');
      expect(designerAgent.sprintPhase).toBe('plan');
    });

    it('references correct skills', () => {
      expect(designerAgent.skills).toEqual([
        'plan-design-review',
        'design-consultation',
        'design-review',
      ]);
    });

    it('has no hard-coded model', () => {
      expect(designerAgent.model).toBeUndefined();
    });
  });

  describe('Builder Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(builderAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(builderAgent.role).toBe('builder');
      expect(builderAgent.sprintPhase).toBe('build');
    });

    it('has empty skills array (general coder)', () => {
      expect(builderAgent.skills).toEqual([]);
    });

    it('has no hard-coded model', () => {
      expect(builderAgent.model).toBeUndefined();
    });
  });

  describe('Reviewer Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(reviewerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(reviewerAgent.role).toBe('reviewer');
      expect(reviewerAgent.sprintPhase).toBe('review');
    });

    it('references correct skills', () => {
      expect(reviewerAgent.skills).toEqual(['review', 'codex']);
    });

    it('has no hard-coded model', () => {
      expect(reviewerAgent.model).toBeUndefined();
    });
  });

  describe('Debugger Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(debuggerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(debuggerAgent.role).toBe('debugger');
      expect(debuggerAgent.sprintPhase).toBe('build');
    });

    it('references correct skills', () => {
      expect(debuggerAgent.skills).toEqual(['investigate']);
    });

    it('has no hard-coded model', () => {
      expect(debuggerAgent.model).toBeUndefined();
    });
  });

  describe('Sprint phase correctness across core agents', () => {
    it('each agent has a valid sprint phase', () => {
      const agents = [
        ceoAgent,
        engManagerAgent,
        designerAgent,
        builderAgent,
        reviewerAgent,
        debuggerAgent,
      ];
      for (const agent of agents) {
        expect(VALID_SPRINT_PHASES.has(agent.sprintPhase)).toBe(true);
      }
    });

    it('phases match expected workflow order', () => {
      expect(ceoAgent.sprintPhase).toBe('think');
      expect(engManagerAgent.sprintPhase).toBe('plan');
      expect(designerAgent.sprintPhase).toBe('plan');
      expect(builderAgent.sprintPhase).toBe('build');
      expect(debuggerAgent.sprintPhase).toBe('build');
      expect(reviewerAgent.sprintPhase).toBe('review');
    });
  });
});
