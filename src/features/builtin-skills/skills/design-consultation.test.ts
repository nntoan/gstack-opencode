import { describe, it, expect } from 'vitest';
import { designConsultationSkill } from './design-consultation.ts';

describe('designConsultationSkill', () => {
  it('has required GstackSkill fields', () => {
    expect(designConsultationSkill.name).toBe('design-consultation');
    expect(designConsultationSkill.group).toBe('review');
    expect(designConsultationSkill.originalSkillName).toBe('gstack-design-consultation');
    expect(designConsultationSkill.browserRequired).toBe(false);
    expect(designConsultationSkill.template.length).toBeGreaterThan(100);
  });

  it('contains no home-path references', () => {
    expect(designConsultationSkill.template).not.toContain('~/.claude/');
    expect(designConsultationSkill.template).not.toContain('~/.codex/');
    expect(designConsultationSkill.template).not.toContain('~/.gstack/');
  });

  it('has a non-empty description', () => {
    expect(designConsultationSkill.description.length).toBeGreaterThan(20);
  });

  it('contains design system structure', () => {
    expect(designConsultationSkill.template).toContain('Phase 1: Product Context');
    expect(designConsultationSkill.template).toContain('Phase 6: Write DESIGN.md');
    expect(designConsultationSkill.template).toContain('SAFE CHOICES');
  });
});
