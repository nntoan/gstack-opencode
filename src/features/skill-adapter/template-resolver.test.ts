import { describe, it, expect } from 'vitest';
import { resolveTemplate, GSTACK_PLACEHOLDER_NAMES } from './template-resolver.ts';

describe('resolveTemplate', () => {
  it('replaces a known placeholder', () => {
    const result = resolveTemplate('Hello {{PREAMBLE}} world', { PREAMBLE: 'TEST_VALUE' });
    expect(result).toBe('Hello TEST_VALUE world');
    expect(result).not.toContain('{{PREAMBLE}}');
  });

  it('leaves unknown placeholders as-is', () => {
    const result = resolveTemplate('Hello {{UNKNOWN_THING}} world', { PREAMBLE: 'x' });
    expect(result).toBe('Hello {{UNKNOWN_THING}} world');
  });

  it('returns content unchanged with empty placeholders object', () => {
    const input = 'No placeholders here';
    expect(resolveTemplate(input, {})).toBe(input);
  });

  it('replaces multiple occurrences of the same placeholder', () => {
    const result = resolveTemplate('{{PREAMBLE}} and {{PREAMBLE}}', { PREAMBLE: 'A' });
    expect(result).toBe('A and A');
  });

  it('handles multiple different placeholders in one string', () => {
    const result = resolveTemplate('{{PREAMBLE}}\n{{BROWSE_SETUP}}\n{{QA_METHODOLOGY}}', {
      PREAMBLE: 'P',
      BROWSE_SETUP: 'B',
      QA_METHODOLOGY: 'Q',
    });
    expect(result).toBe('P\nB\nQ');
  });

  it('handles all 9 gstack placeholder names without error', () => {
    const placeholders: Record<string, string> = {};
    for (const name of GSTACK_PLACEHOLDER_NAMES) {
      placeholders[name] = `REPLACED_${name}`;
    }
    const template = GSTACK_PLACEHOLDER_NAMES.map((n) => `{{${n}}}`).join('\n');
    const result = resolveTemplate(template, placeholders);
    expect(result).not.toMatch(/\{\{[A-Z_]+\}\}/);
    for (const name of GSTACK_PLACEHOLDER_NAMES) {
      expect(result).toContain(`REPLACED_${name}`);
    }
  });

  it('uses DEFAULT_PLACEHOLDERS when no placeholders argument provided', () => {
    const result = resolveTemplate('{{PREAMBLE}}');
    expect(result).not.toContain('{{PREAMBLE}}');
    expect(result.length).toBeGreaterThan(0);
  });
});
