import { describe, it, expect } from 'vitest';
import { parseSnapshotArgs, SNAPSHOT_FLAGS } from './snapshot.ts';

describe('SNAPSHOT_FLAGS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SNAPSHOT_FLAGS)).toBe(true);
    expect(SNAPSHOT_FLAGS.length).toBeGreaterThan(0);
  });

  it('each flag has required shape', () => {
    for (const flag of SNAPSHOT_FLAGS) {
      expect(typeof flag.short).toBe('string');
      expect(typeof flag.long).toBe('string');
      expect(typeof flag.description).toBe('string');
      expect(typeof flag.optionKey).toBe('string');
      expect(flag.short.startsWith('-')).toBe(true);
      expect(flag.long.startsWith('--')).toBe(true);
    }
  });

  it('contains expected flags', () => {
    const shorts = SNAPSHOT_FLAGS.map((f) => f.short);
    expect(shorts).toContain('-i');
    expect(shorts).toContain('-c');
    expect(shorts).toContain('-d');
    expect(shorts).toContain('-s');
    expect(shorts).toContain('-D');
    expect(shorts).toContain('-a');
    expect(shorts).toContain('-o');
    expect(shorts).toContain('-C');
  });

  it('flags with takesValue have valueHint', () => {
    for (const flag of SNAPSHOT_FLAGS) {
      if (flag.takesValue) {
        expect(typeof flag.valueHint).toBe('string');
      }
    }
  });
});

describe('parseSnapshotArgs', () => {
  it('returns empty options for empty args', () => {
    const opts = parseSnapshotArgs([]);
    expect(opts).toEqual({});
  });

  it('parses -i flag', () => {
    const opts = parseSnapshotArgs(['-i']);
    expect(opts.interactive).toBe(true);
  });

  it('parses --interactive flag', () => {
    const opts = parseSnapshotArgs(['--interactive']);
    expect(opts.interactive).toBe(true);
  });

  it('parses -c flag', () => {
    const opts = parseSnapshotArgs(['-c']);
    expect(opts.compact).toBe(true);
  });

  it('parses -d with value', () => {
    const opts = parseSnapshotArgs(['-d', '3']);
    expect(opts.depth).toBe(3);
  });

  it('parses --depth with value', () => {
    const opts = parseSnapshotArgs(['--depth', '5']);
    expect(opts.depth).toBe(5);
  });

  it('parses -s with selector value', () => {
    const opts = parseSnapshotArgs(['-s', '#main']);
    expect(opts.selector).toBe('#main');
  });

  it('parses -D diff flag', () => {
    const opts = parseSnapshotArgs(['-D']);
    expect(opts.diff).toBe(true);
  });

  it('parses -a annotate flag', () => {
    const opts = parseSnapshotArgs(['-a']);
    expect(opts.annotate).toBe(true);
  });

  it('parses -C cursor-interactive flag', () => {
    const opts = parseSnapshotArgs(['-C']);
    expect(opts.cursorInteractive).toBe(true);
  });

  it('parses -o with output path', () => {
    const opts = parseSnapshotArgs(['-o', '/tmp/snap.png']);
    expect(opts.outputPath).toBe('/tmp/snap.png');
  });

  it('parses multiple flags together', () => {
    const opts = parseSnapshotArgs(['-i', '-c', '-d', '2']);
    expect(opts.interactive).toBe(true);
    expect(opts.compact).toBe(true);
    expect(opts.depth).toBe(2);
  });
});
