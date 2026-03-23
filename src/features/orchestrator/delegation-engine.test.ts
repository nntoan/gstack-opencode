import { describe, it, expect } from 'vitest';
import { delegateIntent, getPhaseSkills } from './delegation-engine.ts';
import { createOrchestrator } from './index.ts';
import type { ClassifiedIntent } from './types.ts';
import type { GstackAgent } from '../../types/agent.ts';
import type { BuiltinSkill } from '../../types/skill.ts';
import type { GstackConfig } from '../../types/config.ts';

const makeAgent = (role: string, phase: string, skills: string[] = []): GstackAgent => ({
  role: role as GstackAgent['role'],
  name: role,
  description: `${role} agent`,
  sprintPhase: phase as GstackAgent['sprintPhase'],
  skills,
  instructions: '',
});

const makeSkill = (name: string): BuiltinSkill => ({
  name,
  description: `${name} skill`,
  template: '',
});

const reviewSkill = makeSkill('review');
const codexSkill = makeSkill('codex');
const buildSkill = makeSkill('implement');
const planSkill = makeSkill('plan-eng-review');
const qaSkill = makeSkill('qa');

const allSkills = [reviewSkill, codexSkill, buildSkill, planSkill, qaSkill];

const reviewerAgent = makeAgent('reviewer', 'review', ['review', 'codex']);
const builderAgent = makeAgent('builder', 'build', ['implement']);
const engManagerAgent = makeAgent('eng-manager', 'plan', ['plan-eng-review']);
const qaLeadAgent = makeAgent('qa-lead', 'test', ['qa']);

const allAgents = [reviewerAgent, builderAgent, engManagerAgent, qaLeadAgent];

const baseClassified: ClassifiedIntent = {
  phase: 'review',
  confidence: 0.9,
  suggestedAgent: 'reviewer',
  suggestedSkills: ['review', 'codex'],
  reasoning: 'Matched review patterns',
};

describe('delegation-engine', () => {
  describe('#getPhaseSkills', () => {
    it('returns skills matching the phase', () => {
      const skills = getPhaseSkills('review', allSkills);
      expect(skills.map((s) => s.name)).toContain('review');
      expect(skills.map((s) => s.name)).toContain('codex');
    });

    it('returns empty array when no skills match', () => {
      const skills = getPhaseSkills('reflect', allSkills);
      expect(skills).toHaveLength(0);
    });

    it('filters skills for test phase', () => {
      const skills = getPhaseSkills('test', allSkills);
      expect(skills.map((s) => s.name)).toContain('qa');
    });
  });

  describe('#delegateIntent', () => {
    it('returns null in skills-only mode', () => {
      const result = delegateIntent(baseClassified, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'skills-only',
      });
      expect(result).toBeNull();
    });

    it('delegates to the suggested agent', () => {
      const result = delegateIntent(baseClassified, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
      });
      expect(result).not.toBeNull();
      expect(result?.agent.role).toBe('reviewer');
      expect(result?.phase).toBe('review');
    });

    it('falls back to builder when agent is disabled', () => {
      const result = delegateIntent(baseClassified, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
        disabledAgents: new Set(['reviewer']),
      });
      expect(result).not.toBeNull();
      expect(result?.agent.role).toBe('builder');
      expect(result?.reasoning).toContain('Fallback to builder');
    });

    it('falls back to builder when agent not found', () => {
      const classified: ClassifiedIntent = { ...baseClassified, suggestedAgent: 'doc-engineer' };
      const result = delegateIntent(classified, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
      });
      expect(result?.agent.role).toBe('builder');
    });

    it('includes low confidence note when confidence < 0.5', () => {
      const lowConfidence: ClassifiedIntent = { ...baseClassified, confidence: 0.3 };
      const result = delegateIntent(lowConfidence, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
      });
      expect(result?.reasoning).toContain('Low confidence');
      expect(result?.reasoning).toContain('please confirm intent');
    });

    it('does not add low confidence note when confidence >= 0.5', () => {
      const result = delegateIntent(baseClassified, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
      });
      expect(result?.reasoning).not.toContain('Low confidence');
    });

    it('includes phase skills and suggested skills', () => {
      const result = delegateIntent(baseClassified, {
        agents: allAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
      });
      const skillNames = result?.skills.map((s) => s.name) ?? [];
      expect(skillNames).toContain('review');
      expect(skillNames).toContain('codex');
    });

    it('returns null when no fallback builder exists', () => {
      const noBuilderAgents = [reviewerAgent, engManagerAgent];
      const classified: ClassifiedIntent = { ...baseClassified, suggestedAgent: 'doc-engineer' };
      const result = delegateIntent(classified, {
        agents: noBuilderAgents,
        skills: allSkills,
        orchestrationMode: 'multi-agent',
      });
      expect(result).toBeNull();
    });
  });

  describe('#createOrchestrator', () => {
    const config: GstackConfig = {
      orchestration_mode: 'multi-agent',
      disabled_skills: [],
      disabled_agents: [],
      disabled_mcps: [],
      disabled_hooks: [],
      backlog: { enabled: true, auto_create_tasks: true, auto_update_status: true },
    };

    it('returns orchestrator with classify and delegate', () => {
      const orch = createOrchestrator({ agents: allAgents, skills: allSkills, config });
      expect(typeof orch.classify).toBe('function');
      expect(typeof orch.delegate).toBe('function');
    });

    it('classify → delegate full pipeline', () => {
      const orch = createOrchestrator({ agents: allAgents, skills: allSkills, config });
      const classified = orch.classify('/review');
      const result = orch.delegate(classified);
      expect(classified.phase).toBe('review');
      expect(result?.agent.role).toBe('reviewer');
      expect((result?.skills.length ?? 0) > 0).toBe(true);
    });

    it('skills-only mode: classify returns zero confidence, delegate returns null', () => {
      const skillsOnlyConfig: GstackConfig = { ...config, orchestration_mode: 'skills-only' };
      const orch = createOrchestrator({
        agents: allAgents,
        skills: allSkills,
        config: skillsOnlyConfig,
      });
      const classified = orch.classify('build something');
      expect(classified.confidence).toBe(0);
      const result = orch.delegate(classified);
      expect(result).toBeNull();
    });

    it('respects disabled_agents from config', () => {
      const configWithDisabled: GstackConfig = {
        ...config,
        disabled_agents: ['reviewer'],
      };
      const orch = createOrchestrator({
        agents: allAgents,
        skills: allSkills,
        config: configWithDisabled,
      });
      const classified = orch.classify('/review');
      const result = orch.delegate(classified);
      expect(result?.agent.role).toBe('builder');
    });
  });
});
