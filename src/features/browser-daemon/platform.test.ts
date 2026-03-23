import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { IS_WINDOWS, TEMP_DIR, isPathWithin } from './platform.ts';

describe('platform constants', () => {
  it('IS_WINDOWS is a boolean', () => {
    expect(typeof IS_WINDOWS).toBe('boolean');
  });

  it('TEMP_DIR is a non-empty string', () => {
    expect(typeof TEMP_DIR).toBe('string');
    expect(TEMP_DIR.length).toBeGreaterThan(0);
  });

  it('TEMP_DIR is /tmp on non-Windows', () => {
    if (!IS_WINDOWS) {
      expect(TEMP_DIR).toBe('/tmp');
    }
  });
});

describe('isPathWithin', () => {
  it('returns true for exact match', () => {
    expect(isPathWithin('/tmp/browse', '/tmp/browse')).toBe(true);
  });

  it('returns true for child path', () => {
    expect(isPathWithin('/tmp/browse/file.png', '/tmp/browse')).toBe(true);
    expect(isPathWithin('/tmp/browse/sub/dir/file.png', '/tmp/browse')).toBe(true);
  });

  it('returns false for sibling path', () => {
    expect(isPathWithin('/tmp/other/file.png', '/tmp/browse')).toBe(false);
  });

  it('returns false for partial prefix match (no path sep)', () => {
    expect(isPathWithin('/tmp/browse-extra/file.png', '/tmp/browse')).toBe(false);
  });

  it('handles platform path separators', () => {
    const dir = path.join('/tmp', 'browse');
    const child = path.join('/tmp', 'browse', 'sub', 'file.png');
    expect(isPathWithin(child, dir)).toBe(true);
  });
});
