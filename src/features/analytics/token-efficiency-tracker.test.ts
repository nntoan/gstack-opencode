import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTokenEfficiencyTracker } from './token-efficiency-tracker.ts';
import { readJsonl } from './writer.ts';
import type { TokenMetric } from './types.ts';

const makeTestDir = (): string => {
  const dir = join(
    tmpdir(),
    `gstack-token-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
};

const makeMetric = (overrides?: Partial<TokenMetric>): TokenMetric => ({
  timestamp: Date.now(),
  sessionId: 'sess-1',
  skillName: 'test-skill',
  phase: 'build',
  inputTokens: 100,
  outputTokens: 200,
  totalTokens: 300,
  duration_ms: 500,
  success: true,
  ...overrides,
});

describe('createTokenEfficiencyTracker', () => {
  let testDir: string;
  let analyticsDir: string;

  beforeEach(() => {
    testDir = makeTestDir();
    analyticsDir = join(testDir, 'analytics');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('#track', () => {
    it('writes metric to token-metrics.jsonl in analyticsDir', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: 'plan-skill' }));

      const filePath = join(analyticsDir, 'token-metrics.jsonl');
      expect(existsSync(filePath)).toBe(true);

      const events = readJsonl<TokenMetric>(filePath);
      expect(events).toHaveLength(1);
      expect(events[0].skillName).toBe('plan-skill');
      expect(events[0].inputTokens).toBe(100);
      expect(events[0].outputTokens).toBe(200);
      expect(events[0].totalTokens).toBe(300);
    });

    it('appends multiple metrics preserving order', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: 'skill-a', totalTokens: 100 }));
      await tracker.track(makeMetric({ skillName: 'skill-b', totalTokens: 200 }));
      await tracker.track(makeMetric({ skillName: 'skill-c', totalTokens: 300 }));

      const filePath = join(analyticsDir, 'token-metrics.jsonl');
      const events = readJsonl<TokenMetric>(filePath);
      expect(events).toHaveLength(3);
      expect(events.map((e) => e.skillName)).toEqual(['skill-a', 'skill-b', 'skill-c']);
    });

    it('disabled mode: track is no-op, no file created', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: false });
      await tracker.track(makeMetric());

      const filePath = join(analyticsDir, 'token-metrics.jsonl');
      expect(existsSync(filePath)).toBe(false);
    });

    it('records null skillName for raw conversation metrics', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: null }));

      const filePath = join(analyticsDir, 'token-metrics.jsonl');
      const events = readJsonl<TokenMetric>(filePath);
      expect(events[0].skillName).toBeNull();
    });
  });

  describe('#getReport', () => {
    it('returns sensible defaults for empty metrics', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      const report = await tracker.getReport();

      expect(report.bySkill).toEqual({});
      expect(report.rawConversation.totalTokens).toBe(0);
      expect(report.rawConversation.avgTokensPerMessage).toBe(0);
      expect(report.rawConversation.messageCount).toBe(0);
      expect(report.efficiencyRatio).toBe(0);
    });

    it('aggregates skill metrics correctly', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: 'plan-skill', totalTokens: 400, success: true }));
      await tracker.track(
        makeMetric({ skillName: 'plan-skill', totalTokens: 200, success: false })
      );
      await tracker.track(
        makeMetric({ skillName: 'build-skill', totalTokens: 300, success: true })
      );

      const report = await tracker.getReport();

      expect(report.bySkill['plan-skill'].totalTokens).toBe(600);
      expect(report.bySkill['plan-skill'].invocationCount).toBe(2);
      expect(report.bySkill['plan-skill'].avgTokensPerInvocation).toBe(300);
      expect(report.bySkill['plan-skill'].successRate).toBe(0.5);

      expect(report.bySkill['build-skill'].totalTokens).toBe(300);
      expect(report.bySkill['build-skill'].invocationCount).toBe(1);
      expect(report.bySkill['build-skill'].avgTokensPerInvocation).toBe(300);
      expect(report.bySkill['build-skill'].successRate).toBe(1);
    });

    it('aggregates raw conversation metrics correctly', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: null, totalTokens: 500 }));
      await tracker.track(makeMetric({ skillName: null, totalTokens: 300 }));

      const report = await tracker.getReport();

      expect(report.rawConversation.totalTokens).toBe(800);
      expect(report.rawConversation.messageCount).toBe(2);
      expect(report.rawConversation.avgTokensPerMessage).toBe(400);
    });

    it('computes efficiencyRatio as skillTokens / rawTokens', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: 'x', totalTokens: 200 }));
      await tracker.track(makeMetric({ skillName: null, totalTokens: 400 }));

      const report = await tracker.getReport();

      expect(report.efficiencyRatio).toBe(0.5); // 200 / 400
    });

    it('efficiencyRatio is 0 when no raw metrics exist', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      await tracker.track(makeMetric({ skillName: 'x', totalTokens: 200 }));

      const report = await tracker.getReport();

      expect(report.efficiencyRatio).toBe(0);
    });

    it('filters by since timestamp', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      const oldTs = 1000;
      const newTs = Date.now();

      await tracker.track(
        makeMetric({ skillName: 'old-skill', timestamp: oldTs, totalTokens: 999 })
      );
      await tracker.track(
        makeMetric({ skillName: 'new-skill', timestamp: newTs, totalTokens: 100 })
      );

      const report = await tracker.getReport(newTs);

      expect(report.bySkill['new-skill']).toBeDefined();
      expect(report.bySkill['old-skill']).toBeUndefined();
      expect(report.bySkill['new-skill'].totalTokens).toBe(100);
    });

    it('period.start uses since param when provided', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      const since = 5000;

      const report = await tracker.getReport(since);

      expect(report.period.start).toBe(since);
    });

    it('period.start uses first metric timestamp when since is not provided', async () => {
      const tracker = createTokenEfficiencyTracker({ analyticsDir, enabled: true });
      const ts = 9999999;
      await tracker.track(makeMetric({ timestamp: ts }));

      const report = await tracker.getReport();

      expect(report.period.start).toBe(ts);
    });
  });
});
