import { describe, expect, it } from 'vitest';
import { CircularBuffer } from './buffers.ts';

describe('browser-daemon/buffers', () => {
  it('keeps only capacity-sized entries and evicts oldest items', () => {
    const buffer = new CircularBuffer<number>(3);
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);

    expect(buffer.length).toBe(3);
    expect(buffer.toArray()).toEqual([2, 3, 4]);
    expect(buffer.totalAdded).toBe(4);
  });

  it('returns last N entries in insertion order', () => {
    const buffer = new CircularBuffer<string>(5);
    buffer.push('a');
    buffer.push('b');
    buffer.push('c');
    buffer.push('d');

    expect(buffer.last(2)).toEqual(['c', 'd']);
    expect(buffer.last(10)).toEqual(['a', 'b', 'c', 'd']);
  });
});
