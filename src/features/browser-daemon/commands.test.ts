import { describe, it, expect } from 'vitest';
import {
  READ_COMMANDS,
  WRITE_COMMANDS,
  META_COMMANDS,
  ALL_COMMANDS,
  COMMAND_DESCRIPTIONS,
} from './commands.ts';

describe('commands registry', () => {
  it('READ_COMMANDS is a Set', () => {
    expect(READ_COMMANDS).toBeInstanceOf(Set);
    expect(READ_COMMANDS.size).toBeGreaterThan(0);
  });

  it('WRITE_COMMANDS is a Set', () => {
    expect(WRITE_COMMANDS).toBeInstanceOf(Set);
    expect(WRITE_COMMANDS.size).toBeGreaterThan(0);
  });

  it('META_COMMANDS is a Set', () => {
    expect(META_COMMANDS).toBeInstanceOf(Set);
    expect(META_COMMANDS.size).toBeGreaterThan(0);
  });

  it('ALL_COMMANDS is the union of READ, WRITE, and META', () => {
    expect(ALL_COMMANDS).toBeInstanceOf(Set);
    for (const cmd of READ_COMMANDS) {
      expect(ALL_COMMANDS.has(cmd)).toBe(true);
    }
    for (const cmd of WRITE_COMMANDS) {
      expect(ALL_COMMANDS.has(cmd)).toBe(true);
    }
    for (const cmd of META_COMMANDS) {
      expect(ALL_COMMANDS.has(cmd)).toBe(true);
    }
  });

  it('ALL_COMMANDS contains no duplicates across sets', () => {
    expect(ALL_COMMANDS.size).toBe(READ_COMMANDS.size + WRITE_COMMANDS.size + META_COMMANDS.size);
  });

  it('COMMAND_DESCRIPTIONS covers every command in ALL_COMMANDS', () => {
    for (const cmd of ALL_COMMANDS) {
      expect(COMMAND_DESCRIPTIONS).toHaveProperty(cmd);
    }
  });

  it('COMMAND_DESCRIPTIONS has no unknown commands', () => {
    for (const key of Object.keys(COMMAND_DESCRIPTIONS)) {
      expect(ALL_COMMANDS.has(key)).toBe(true);
    }
  });

  it('each COMMAND_DESCRIPTIONS entry has category and description', () => {
    for (const [cmd, entry] of Object.entries(COMMAND_DESCRIPTIONS)) {
      expect(typeof entry.category).toBe('string');
      expect(typeof entry.description).toBe('string');
      expect(entry.category.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      // usage is optional
      if (entry.usage !== undefined) {
        expect(typeof entry.usage).toBe('string');
      }
      void cmd;
    }
  });

  it('known read commands are present', () => {
    expect(READ_COMMANDS.has('text')).toBe(true);
    expect(READ_COMMANDS.has('html')).toBe(true);
    expect(READ_COMMANDS.has('links')).toBe(true);
    expect(READ_COMMANDS.has('cookies')).toBe(true);
  });

  it('known write commands are present', () => {
    expect(WRITE_COMMANDS.has('goto')).toBe(true);
    expect(WRITE_COMMANDS.has('click')).toBe(true);
    expect(WRITE_COMMANDS.has('fill')).toBe(true);
    expect(WRITE_COMMANDS.has('upload')).toBe(true);
  });

  it('known meta commands are present', () => {
    expect(META_COMMANDS.has('snapshot')).toBe(true);
    expect(META_COMMANDS.has('screenshot')).toBe(true);
    expect(META_COMMANDS.has('handoff')).toBe(true);
    expect(META_COMMANDS.has('resume')).toBe(true);
  });
});
