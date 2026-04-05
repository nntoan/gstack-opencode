import { describe, it, expect } from 'vitest';
import { buildDelegationSystemPrompt } from './system-prompt-builder.ts';
import type { DelegationResult } from './delegation-engine.ts';
import type { GstackAgent } from '../../types/agent.ts';
import type { BuiltinSkill } from '../../types/skill.ts';

const makeAgent = (role: string, instructions = ''): GstackAgent => ({
  role: role as GstackAgent['role'],
  name: role,
  description: `${role} agent`,
  sprintPhase: 'build',
  skills: [],
  instructions,
});

const makeSkill = (name: string): BuiltinSkill => ({
  name,
  description: `${name} skill description`,
  template: '',
});

describe('buildDelegationSystemPrompt', () => {
  it('includes agent name and role in the header', () => {
    const result: DelegationResult = {
      agent: makeAgent('builder'),
      skills: [],
      phase: 'build',
      reasoning: 'Pattern matched build phase',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).toContain('## Active Agent Context');
    expect(prompt).toContain('**Agent:** builder (builder)');
  });

  it('includes sprint phase and reasoning', () => {
    const result: DelegationResult = {
      agent: makeAgent('reviewer'),
      skills: [],
      phase: 'review',
      reasoning: 'Explicit /review command',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).toContain('**Sprint Phase:** review');
    expect(prompt).toContain('**Reasoning:** Explicit /review command');
  });

  it('includes agent instructions when present', () => {
    const result: DelegationResult = {
      agent: makeAgent('builder', 'Always write tests first.'),
      skills: [],
      phase: 'build',
      reasoning: 'test',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).toContain('### Agent Instructions');
    expect(prompt).toContain('Always write tests first.');
  });

  it('omits agent instructions section when instructions are empty', () => {
    const result: DelegationResult = {
      agent: makeAgent('builder', ''),
      skills: [],
      phase: 'build',
      reasoning: 'test',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).not.toContain('### Agent Instructions');
  });

  it('includes active skills section when skills are present', () => {
    const result: DelegationResult = {
      agent: makeAgent('builder'),
      skills: [makeSkill('implement'), makeSkill('codex')],
      phase: 'build',
      reasoning: 'test',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).toContain('### Active Skills');
    expect(prompt).toContain('#### /implement');
    expect(prompt).toContain('implement skill description');
    expect(prompt).toContain('#### /codex');
    expect(prompt).toContain('codex skill description');
  });

  it('omits active skills section when no skills are activated', () => {
    const result: DelegationResult = {
      agent: makeAgent('builder'),
      skills: [],
      phase: 'build',
      reasoning: 'test',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).not.toContain('### Active Skills');
  });

  it('includes all sections when agent has instructions and skills', () => {
    const result: DelegationResult = {
      agent: makeAgent('reviewer', 'Review thoroughly.'),
      skills: [makeSkill('review')],
      phase: 'review',
      reasoning: 'High confidence',
    };
    const prompt = buildDelegationSystemPrompt(result);
    expect(prompt).toContain('## Active Agent Context');
    expect(prompt).toContain('### Agent Instructions');
    expect(prompt).toContain('Review thoroughly.');
    expect(prompt).toContain('### Active Skills');
    expect(prompt).toContain('#### /review');
  });
});
