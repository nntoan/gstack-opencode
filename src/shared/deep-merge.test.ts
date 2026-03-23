import { describe, it, expect } from 'bun:test';
import { deepMerge, isPlainObject } from './deep-merge.ts';

type AnyObject = Record<string, unknown>;

describe('isPlainObject', () => {
  it('returns false for null', () => {
    const value = null;
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for undefined', () => {
    const value = undefined;
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for string', () => {
    const value = 'hello';
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for number', () => {
    const value = 42;
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for boolean', () => {
    const value = true;
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for array', () => {
    const value = [1, 2, 3];
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for Date', () => {
    const value = new Date();
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns false for RegExp', () => {
    const value = /test/;
    const result = isPlainObject(value);
    expect(result).toBe(false);
  });

  it('returns true for plain object', () => {
    const value = { a: 1 };
    const result = isPlainObject(value);
    expect(result).toBe(true);
  });

  it('returns true for empty object', () => {
    const value = {};
    const result = isPlainObject(value);
    expect(result).toBe(true);
  });

  it('returns true for nested object', () => {
    const value = { a: { b: 1 } };
    const result = isPlainObject(value);
    expect(result).toBe(true);
  });
});

describe('deepMerge', () => {
  describe('basic merging', () => {
    it('merges two simple objects', () => {
      const base: AnyObject = { a: 1 };
      const override: AnyObject = { b: 2 };
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('override value takes precedence', () => {
      const base = { a: 1 };
      const override = { a: 2 };
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: 2 });
    });

    it('deeply merges nested objects', () => {
      const base: AnyObject = { a: { b: 1, c: 2 } };
      const override: AnyObject = { a: { b: 10 } };
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: { b: 10, c: 2 } });
    });

    it('handles multiple levels of nesting', () => {
      const base: AnyObject = { a: { b: { c: { d: 1 } } } };
      const override: AnyObject = { a: { b: { c: { e: 2 } } } };
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
    });
  });

  describe('edge cases', () => {
    it('returns undefined when both are undefined', () => {
      const base = undefined;
      const override = undefined;
      const result = deepMerge<AnyObject>(base, override);
      expect(result).toBeUndefined();
    });

    it('returns override when base is undefined', () => {
      const base = undefined;
      const override = { a: 1 };
      const result = deepMerge<AnyObject>(base, override);
      expect(result).toEqual({ a: 1 });
    });

    it('returns base when override is undefined', () => {
      const base = { a: 1 };
      const override = undefined;
      const result = deepMerge<AnyObject>(base, override);
      expect(result).toEqual({ a: 1 });
    });

    it('preserves base value when override value is undefined', () => {
      const base = { a: 1, b: 2 };
      const override: Partial<typeof base> = { a: undefined, b: 3 };
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it('does not mutate base object', () => {
      const base = { a: 1, b: { c: 2 } };
      const override = { b: { c: 10 } };
      const originalBase = JSON.parse(JSON.stringify(base));
      deepMerge(base, override);
      expect(base).toEqual(originalBase);
    });
  });

  describe('array handling', () => {
    it('replaces arrays instead of merging them', () => {
      const base = { arr: [1, 2] };
      const override = { arr: [3, 4, 5] };
      const result = deepMerge(base, override);
      expect(result).toEqual({ arr: [3, 4, 5] });
    });

    it('replaces nested arrays', () => {
      const base = { a: { arr: [1, 2, 3] } };
      const override = { a: { arr: [4] } };
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: { arr: [4] } });
    });
  });

  describe('prototype pollution protection', () => {
    it('ignores __proto__ key', () => {
      const base: AnyObject = { a: 1 };
      const override: AnyObject = JSON.parse('{"__proto__": {"polluted": true}, "b": 2}');
      const result = deepMerge(base, override);
      expect(result).toEqual({ a: 1, b: 2 });
      expect(({} as AnyObject).polluted).toBeUndefined();
    });

    it('ignores constructor key', () => {
      const base: AnyObject = { a: 1 };
      const override: AnyObject = { constructor: { polluted: true }, b: 2 };
      const result = deepMerge(base, override);
      expect(result!.b).toBe(2);
      expect(result!['constructor']).not.toEqual({ polluted: true });
    });

    it('ignores prototype key', () => {
      const base: AnyObject = { a: 1 };
      const override: AnyObject = { prototype: { polluted: true }, b: 2 };
      const result = deepMerge(base, override);
      expect(result!.b).toBe(2);
      expect(result!.prototype).toBeUndefined();
    });
  });

  describe('depth limit', () => {
    it('returns override when depth exceeds MAX_DEPTH', () => {
      const createDeepObject = (depth: number, leaf: AnyObject): AnyObject => {
        if (depth === 0) return leaf;
        return { nested: createDeepObject(depth - 1, leaf) };
      };
      const base = createDeepObject(55, { baseKey: 'base' });
      const override = createDeepObject(55, { overrideKey: 'override' });
      const result = deepMerge(base, override);
      let current: AnyObject = result as AnyObject;
      for (let i = 0; i < 55; i++) {
        current = current.nested as AnyObject;
      }
      expect(current.overrideKey).toBe('override');
      expect(current.baseKey).toBeUndefined();
    });
  });
});
