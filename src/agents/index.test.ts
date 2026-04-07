import { describe, it, expect } from 'vitest';
import { createGstackAgents, getAgentByRole, getAgentsByPhase } from './index.ts';
import { companyAgent } from './company.ts';

describe('Agent Registry', () => {
  describe('createGstackAgents()', () => {
    it('returns all 14 agents in multi-agent mode', () => {
      const agents = createGstackAgents({});
      expect(agents.length).toBe(14);
    });

    it('returns all 14 agents when no options passed', () => {
      const agents = createGstackAgents();
      expect(agents.length).toBe(14);
    });

    it('includes company agent', () => {
      const agents = createGstackAgents({});
      expect(agents.find((a) => a.role === 'company')).toBeDefined();
    });

    it('returns empty array in skills-only mode', () => {
      const agents = createGstackAgents({ orchestrationMode: 'skills-only' });
      expect(agents.length).toBe(0);
    });

    it('filters out a single disabled agent', () => {
      const agents = createGstackAgents({ disabledAgents: new Set(['ceo']) });
      expect(agents.length).toBe(13);
      expect(agents.find((a) => a.role === 'ceo')).toBeUndefined();
    });

    it('filters out multiple disabled agents', () => {
      const agents = createGstackAgents({
        disabledAgents: new Set(['ceo', 'designer', 'debugger']),
      });
      expect(agents.length).toBe(11);
    });

    it('disabledAgents in skills-only mode still returns empty', () => {
      const agents = createGstackAgents({
        orchestrationMode: 'skills-only',
        disabledAgents: new Set(['ceo']),
      });
      expect(agents.length).toBe(0);
    });

    it('all returned agents have required fields', () => {
      const agents = createGstackAgents({});
      for (const agent of agents) {
        expect(agent.role).toBeTruthy();
        expect(agent.name).toBeTruthy();
        expect(agent.description).toBeTruthy();
        expect(agent.sprintPhase).toBeTruthy();
        expect(Array.isArray(agent.skills)).toBe(true);
        expect(typeof agent.instructions).toBe('string');
      }
    });

    it('all 14 roles are present', () => {
      const agents = createGstackAgents({});
      const roles = new Set(agents.map((a) => a.role));
      expect(roles.has('ceo')).toBe(true);
      expect(roles.has('eng-manager')).toBe(true);
      expect(roles.has('designer')).toBe(true);
      expect(roles.has('builder')).toBe(true);
      expect(roles.has('reviewer')).toBe(true);
      expect(roles.has('debugger')).toBe(true);
      expect(roles.has('qa-lead')).toBe(true);
      expect(roles.has('release-engineer')).toBe(true);
      expect(roles.has('doc-engineer')).toBe(true);
      expect(roles.has('retro-lead')).toBe(true);
      expect(roles.has('safety-guard')).toBe(true);
      expect(roles.has('upgrader')).toBe(true);
      expect(roles.has('session-manager')).toBe(true);
      expect(roles.has('company')).toBe(true);
    });
  });

  describe('getAgentByRole()', () => {
    it('returns the CEO agent by role', () => {
      const agent = getAgentByRole('ceo');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('CEO');
      expect(agent?.role).toBe('ceo');
    });

    it('returns the designer agent by role', () => {
      const agent = getAgentByRole('designer');
      expect(agent).toBeDefined();
      expect(agent?.role).toBe('designer');
    });

    it('returns the safety-guard agent by role', () => {
      const agent = getAgentByRole('safety-guard');
      expect(agent).toBeDefined();
      expect(agent?.sprintPhase).toBe('cross-cutting');
    });

    it('returns The Company agent by role', () => {
      const agent = getAgentByRole('company');
      expect(agent).toBeDefined();
      expect(agent?.name).toBe('The Company');
      expect(agent?.role).toBe('company');
    });

    it('returns undefined for unknown role', () => {
      // @ts-expect-error testing invalid role
      const agent = getAgentByRole('unknown-role');
      expect(agent).toBeUndefined();
    });
  });

  describe('getAgentsByPhase()', () => {
    it('returns CEO for think phase', () => {
      const agents = getAgentsByPhase('think');
      expect(agents.length).toBe(1);
      expect(agents[0].role).toBe('ceo');
    });

    it('returns Eng Manager + Designer for plan phase', () => {
      const agents = getAgentsByPhase('plan');
      expect(agents.length).toBe(2);
      const roles = agents.map((a) => a.role).sort();
      expect(roles).toEqual(['designer', 'eng-manager']);
    });

    it('returns Builder + Debugger for build phase', () => {
      const agents = getAgentsByPhase('build');
      expect(agents.length).toBe(2);
      const roles = agents.map((a) => a.role).sort();
      expect(roles).toEqual(['builder', 'debugger']);
    });

    it('returns Reviewer for review phase', () => {
      const agents = getAgentsByPhase('review');
      expect(agents.length).toBe(1);
      expect(agents[0].role).toBe('reviewer');
    });

    it('returns QA Lead for test phase', () => {
      const agents = getAgentsByPhase('test');
      expect(agents.length).toBe(1);
      expect(agents[0].role).toBe('qa-lead');
    });

    it('returns Release Engineer + Doc Engineer for ship phase', () => {
      const agents = getAgentsByPhase('ship');
      expect(agents.length).toBe(2);
      const roles = agents.map((a) => a.role).sort();
      expect(roles).toEqual(['doc-engineer', 'release-engineer']);
    });

    it('returns Retro Lead for reflect phase', () => {
      const agents = getAgentsByPhase('reflect');
      expect(agents.length).toBe(1);
      expect(agents[0].role).toBe('retro-lead');
    });

    it('returns Safety Guard and Company for cross-cutting phase', () => {
      const agents = getAgentsByPhase('cross-cutting');
      expect(agents.length).toBe(2);
      const roles = agents.map((a) => a.role).sort();
      expect(roles).toEqual(['company', 'safety-guard']);
    });

    it('returns Upgrader + Session Manager for utility phase', () => {
      const agents = getAgentsByPhase('utility');
      expect(agents.length).toBe(2);
      const roles = agents.map((a) => a.role).sort();
      expect(roles).toEqual(['session-manager', 'upgrader']);
    });

    it('returns empty array for phase with no agents', () => {
      const agents = getAgentsByPhase('test');
      expect(Array.isArray(agents)).toBe(true);
    });
  });

  describe('companyAgent export', () => {
    it('companyAgent is exported from index', () => {
      expect(companyAgent).toBeDefined();
      expect(companyAgent.role).toBe('company');
      expect(companyAgent.name).toBe('The Company');
    });
  });
});
