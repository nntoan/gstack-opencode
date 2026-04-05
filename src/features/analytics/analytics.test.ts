import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAnalytics } from './index.ts';
import { appendJsonl, readJsonl } from './writer.ts';
import { createEurekaTracker } from './eureka-tracker.ts';
import { createSkillUsageTracker } from './skill-usage-tracker.ts';
import { createSprintLogger } from './sprint-logger.ts';
import type { EurekaEvent, SkillUsageEvent, SprintLogEvent } from './types.ts';

const makeTestDir = (): string => {
  const dir = join(
    tmpdir(),
    `gstack-analytics-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
};

describe('analytics', () => {
  let testDir: string;
  let analyticsDir: string;

  beforeEach(() => {
    testDir = makeTestDir();
    analyticsDir = join(testDir, 'analytics');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('#appendJsonl', () => {
    it('writes a valid JSON line to file and creates dirs lazily', async () => {
      const filePath = join(analyticsDir, 'test.jsonl');
      expect(existsSync(analyticsDir)).toBe(false);

      await appendJsonl(filePath, { foo: 'bar', num: 42 });

      expect(existsSync(filePath)).toBe(true);
      const events = readJsonl<{ foo: string; num: number }>(filePath);
      expect(events).toHaveLength(1);
      expect(events[0].foo).toBe('bar');
      expect(events[0].num).toBe(42);
    });

    it('appends multiple lines preserving order', async () => {
      const filePath = join(analyticsDir, 'multi.jsonl');
      await appendJsonl(filePath, { seq: 1 });
      await appendJsonl(filePath, { seq: 2 });
      await appendJsonl(filePath, { seq: 3 });

      const events = readJsonl<{ seq: number }>(filePath);
      expect(events).toHaveLength(3);
      expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
    });
  });

  describe('#readJsonl', () => {
    it('returns empty array when file does not exist', () => {
      const result = readJsonl('/nonexistent/path/file.jsonl');
      expect(result).toEqual([]);
    });
  });

  describe('createSkillUsageTracker', () => {
    const makeEvent = (overrides?: Partial<SkillUsageEvent>): SkillUsageEvent => ({
      timestamp: new Date().toISOString(),
      skillName: 'test-skill',
      duration: 100,
      success: true,
      version: '1.0.0',
      ...overrides,
    });

    it('record writes to skill-usage.jsonl in analyticsDir', () => {
      const tracker = createSkillUsageTracker({ analyticsDir, enabled: true });
      tracker.record(makeEvent({ skillName: 'my-skill' }));

      const filePath = join(analyticsDir, 'skill-usage.jsonl');
      expect(existsSync(filePath)).toBe(true);
      const events = readJsonl<SkillUsageEvent>(filePath);
      expect(events[0].skillName).toBe('my-skill');
    });

    it('getRecent returns last N events', () => {
      const tracker = createSkillUsageTracker({ analyticsDir, enabled: true });
      for (let i = 1; i <= 5; i++) {
        tracker.record(makeEvent({ skillName: `skill-${i}` }));
      }

      const recent = tracker.getRecent(3);
      expect(recent).toHaveLength(3);
      expect(recent.map((e) => e.skillName)).toEqual(['skill-3', 'skill-4', 'skill-5']);
    });

    it('disabled mode: record is no-op, no file created', () => {
      const tracker = createSkillUsageTracker({ analyticsDir, enabled: false });
      tracker.record(makeEvent());

      const filePath = join(analyticsDir, 'skill-usage.jsonl');
      expect(existsSync(filePath)).toBe(false);
    });

    it('directory creation is lazy (not on tracker creation)', () => {
      createSkillUsageTracker({ analyticsDir, enabled: true });
      expect(existsSync(analyticsDir)).toBe(false);
    });
  });

  describe('createEurekaTracker', () => {
    const makeEvent = (overrides?: Partial<EurekaEvent>): EurekaEvent => ({
      timestamp: new Date().toISOString(),
      skillName: 'test-skill',
      insight: 'some insight',
      category: 'learning',
      ...overrides,
    });

    it('record writes to eureka.jsonl', () => {
      const tracker = createEurekaTracker({ analyticsDir, enabled: true });
      tracker.record(makeEvent({ skillName: 'eureka-skill' }));

      const filePath = join(analyticsDir, 'eureka.jsonl');
      expect(existsSync(filePath)).toBe(true);
    });

    it('getInsights returns all insights when skillName not provided', () => {
      const tracker = createEurekaTracker({ analyticsDir, enabled: true });
      tracker.record(makeEvent({ skillName: 'skill-a' }));
      tracker.record(makeEvent({ skillName: 'skill-b' }));

      const insights = tracker.getInsights();
      expect(insights).toHaveLength(2);
    });

    it('getInsights filtered by skillName', () => {
      const tracker = createEurekaTracker({ analyticsDir, enabled: true });
      tracker.record(makeEvent({ skillName: 'skill-a', insight: 'alpha' }));
      tracker.record(makeEvent({ skillName: 'skill-b', insight: 'beta' }));
      tracker.record(makeEvent({ skillName: 'skill-a', insight: 'gamma' }));

      const insights = tracker.getInsights('skill-a');
      expect(insights).toHaveLength(2);
      expect(insights.map((e) => e.insight)).toEqual(['alpha', 'gamma']);
    });

    it('disabled mode: record is no-op, no file created', () => {
      const tracker = createEurekaTracker({ analyticsDir, enabled: false });
      tracker.record(makeEvent());

      const filePath = join(analyticsDir, 'eureka.jsonl');
      expect(existsSync(filePath)).toBe(false);
    });
  });

  describe('createSprintLogger', () => {
    const makeEvent = (overrides?: Partial<SprintLogEvent>): SprintLogEvent => ({
      timestamp: new Date().toISOString(),
      phase: 'build',
      action: 'started',
      ...overrides,
    });

    it('log writes to orchestrator dir, NOT analytics dir', () => {
      const logger = createSprintLogger({ analyticsDir, enabled: true });
      logger.log(makeEvent({ phase: 'plan', action: 'started' }));

      const sprintLogPath = join(testDir, 'orchestrator', 'sprint-log.jsonl');
      const wrongPath = join(analyticsDir, 'sprint-log.jsonl');

      expect(existsSync(sprintLogPath)).toBe(true);
      expect(existsSync(wrongPath)).toBe(false);
    });

    it('getPhaseHistory reads full sprint log', () => {
      const logger = createSprintLogger({ analyticsDir, enabled: true });
      logger.log(makeEvent({ phase: 'plan', action: 'started' }));
      logger.log(makeEvent({ phase: 'build', action: 'completed' }));

      const history = logger.getPhaseHistory();
      expect(history).toHaveLength(2);
      expect(history[0].phase).toBe('plan');
      expect(history[1].phase).toBe('build');
    });

    it('disabled mode: log is no-op, no file created', () => {
      const logger = createSprintLogger({ analyticsDir, enabled: false });
      logger.log(makeEvent());

      const sprintLogPath = join(testDir, 'orchestrator', 'sprint-log.jsonl');
      expect(existsSync(sprintLogPath)).toBe(false);
    });
  });

  describe('createAnalytics', () => {
    it('factory returns { skillUsage, eureka, sprintLog, tokenEfficiency }', () => {
      const analytics = createAnalytics({ analyticsDir, enabled: true });
      expect(typeof analytics.skillUsage.record).toBe('function');
      expect(typeof analytics.skillUsage.getRecent).toBe('function');
      expect(typeof analytics.eureka.record).toBe('function');
      expect(typeof analytics.eureka.getInsights).toBe('function');
      expect(typeof analytics.sprintLog.log).toBe('function');
      expect(typeof analytics.sprintLog.getPhaseHistory).toBe('function');
      expect(typeof analytics.tokenEfficiency.track).toBe('function');
      expect(typeof analytics.tokenEfficiency.getReport).toBe('function');
    });

    it('all trackers are no-ops when disabled', async () => {
      const analytics = createAnalytics({ analyticsDir, enabled: false });
      analytics.skillUsage.record({
        timestamp: new Date().toISOString(),
        skillName: 'x',
        duration: 1,
        success: true,
        version: '1.0.0',
      });
      analytics.eureka.record({
        timestamp: new Date().toISOString(),
        skillName: 'x',
        insight: 'y',
        category: 'bug',
      });
      analytics.sprintLog.log({
        timestamp: new Date().toISOString(),
        phase: 'build',
        action: 'started',
      });
      await analytics.tokenEfficiency.track({
        timestamp: Date.now(),
        sessionId: 'test-session',
        skillName: 'x',
        phase: 'build',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        duration_ms: 100,
        success: true,
      });

      expect(existsSync(analyticsDir)).toBe(false);
    });
  });
});
