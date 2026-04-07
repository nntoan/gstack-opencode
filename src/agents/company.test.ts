import { describe, it, expect } from 'bun:test';
import { companyAgent } from './company.ts';

describe('Company Agent', () => {
  it('has role "company"', () => {
    expect(companyAgent.role).toBe('company');
  });

  it('has name "The Company"', () => {
    expect(companyAgent.name).toBe('The Company');
  });

  it('has no hard-coded model', () => {
    expect(companyAgent.model).toBeUndefined();
  });

  it('has a description', () => {
    expect(companyAgent.description).toBeTruthy();
    expect(typeof companyAgent.description).toBe('string');
  });

  it('has a sprintPhase', () => {
    expect(companyAgent.sprintPhase).toBeTruthy();
  });

  it('has a skills array', () => {
    expect(Array.isArray(companyAgent.skills)).toBe(true);
  });

  it('has instructions', () => {
    expect(typeof companyAgent.instructions).toBe('string');
    expect(companyAgent.instructions.length).toBeGreaterThan(0);
  });
});
