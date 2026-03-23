import { describe, it, expect } from 'vitest';
import { qaLeadAgent } from './qa-lead.ts';
import { releaseEngineerAgent } from './release-engineer.ts';
import { docEngineerAgent } from './doc-engineer.ts';
import { retroLeadAgent } from './retro-lead.ts';
import { safetyGuardAgent } from './safety-guard.ts';
import { upgraderAgent } from './upgrader.ts';
import { sessionManagerAgent } from './session-manager.ts';
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

describe('Support Agent Definitions', () => {
  describe('QA Lead Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(qaLeadAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(qaLeadAgent.role).toBe('qa-lead');
      expect(qaLeadAgent.sprintPhase).toBe('test');
    });

    it('references correct skills', () => {
      expect(qaLeadAgent.skills).toEqual(['qa', 'qa-only', 'browse', 'benchmark']);
    });

    it('has no hard-coded model', () => {
      expect(qaLeadAgent.model).toBeUndefined();
    });
  });

  describe('Release Engineer Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(releaseEngineerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(releaseEngineerAgent.role).toBe('release-engineer');
      expect(releaseEngineerAgent.sprintPhase).toBe('ship');
    });

    it('references correct skills', () => {
      expect(releaseEngineerAgent.skills).toEqual([
        'ship',
        'land-and-deploy',
        'canary',
        'setup-deploy',
      ]);
    });

    it('has no hard-coded model', () => {
      expect(releaseEngineerAgent.model).toBeUndefined();
    });
  });

  describe('Doc Engineer Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(docEngineerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(docEngineerAgent.role).toBe('doc-engineer');
      expect(docEngineerAgent.sprintPhase).toBe('ship');
    });

    it('references correct skills', () => {
      expect(docEngineerAgent.skills).toEqual(['document-release']);
    });

    it('has no hard-coded model', () => {
      expect(docEngineerAgent.model).toBeUndefined();
    });
  });

  describe('Retro Lead Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(retroLeadAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(retroLeadAgent.role).toBe('retro-lead');
      expect(retroLeadAgent.sprintPhase).toBe('reflect');
    });

    it('references correct skills', () => {
      expect(retroLeadAgent.skills).toEqual(['retro']);
    });

    it('has no hard-coded model', () => {
      expect(retroLeadAgent.model).toBeUndefined();
    });
  });

  describe('Safety Guard Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(safetyGuardAgent);
    });

    it('has correct role and cross-cutting sprint phase', () => {
      expect(safetyGuardAgent.role).toBe('safety-guard');
      expect(safetyGuardAgent.sprintPhase).toBe('cross-cutting');
    });

    it('references correct skills', () => {
      expect(safetyGuardAgent.skills).toEqual(['careful', 'freeze', 'guard', 'unfreeze']);
    });

    it('has no hard-coded model', () => {
      expect(safetyGuardAgent.model).toBeUndefined();
    });
  });

  describe('Upgrader Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(upgraderAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(upgraderAgent.role).toBe('upgrader');
      expect(upgraderAgent.sprintPhase).toBe('utility');
    });

    it('references correct skills', () => {
      expect(upgraderAgent.skills).toEqual(['upgrade']);
    });

    it('has no hard-coded model', () => {
      expect(upgraderAgent.model).toBeUndefined();
    });
  });

  describe('Session Manager Agent', () => {
    it('exports a valid GstackAgent', () => {
      assertValidAgent(sessionManagerAgent);
    });

    it('has correct role and sprint phase', () => {
      expect(sessionManagerAgent.role).toBe('session-manager');
      expect(sessionManagerAgent.sprintPhase).toBe('utility');
    });

    it('references correct skills', () => {
      expect(sessionManagerAgent.skills).toEqual(['setup-browser-cookies']);
    });

    it('has no hard-coded model', () => {
      expect(sessionManagerAgent.model).toBeUndefined();
    });
  });

  describe('All support agents combined', () => {
    it('total of 7 support agents defined', () => {
      const agents = [
        qaLeadAgent,
        releaseEngineerAgent,
        docEngineerAgent,
        retroLeadAgent,
        safetyGuardAgent,
        upgraderAgent,
        sessionManagerAgent,
      ];
      expect(agents.length).toBe(7);
    });

    it('each support agent has a valid sprint phase', () => {
      const agents = [
        qaLeadAgent,
        releaseEngineerAgent,
        docEngineerAgent,
        retroLeadAgent,
        safetyGuardAgent,
        upgraderAgent,
        sessionManagerAgent,
      ];
      for (const agent of agents) {
        expect(VALID_SPRINT_PHASES.has(agent.sprintPhase)).toBe(true);
      }
    });

    it('no support agent has a hard-coded model', () => {
      const agents = [
        qaLeadAgent,
        releaseEngineerAgent,
        docEngineerAgent,
        retroLeadAgent,
        safetyGuardAgent,
        upgraderAgent,
        sessionManagerAgent,
      ];
      for (const agent of agents) {
        expect(agent.model).toBeUndefined();
      }
    });
  });
});
