import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { log, getLogFilePath } from './logger.ts';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';

describe('logger', () => {
  const logFilePath = getLogFilePath();

  beforeEach(() => {
    if (existsSync(logFilePath)) {
      unlinkSync(logFilePath);
    }
  });

  afterEach(() => {
    if (existsSync(logFilePath)) {
      unlinkSync(logFilePath);
    }
  });

  it('logs message to file with timestamp', async () => {
    log('test message');
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(existsSync(logFilePath)).toBe(true);
    const content = readFileSync(logFilePath, 'utf-8');
    expect(content).toContain('[GSTACK]');
    expect(content).toContain('test message');
  });

  it('includes ISO timestamp in log entry', async () => {
    log('timestamp test');
    await new Promise((resolve) => setTimeout(resolve, 600));

    const content = readFileSync(logFilePath, 'utf-8');
    expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });

  it('logs data as JSON when provided', async () => {
    const testData = { key: 'value', nested: { prop: 123 } };
    log('with data', testData);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const content = readFileSync(logFilePath, 'utf-8');
    expect(content).toContain('key');
    expect(content).toContain('value');
  });

  it('returns log file path', () => {
    expect(logFilePath).toBe('/tmp/gstack.log');
  });
});
