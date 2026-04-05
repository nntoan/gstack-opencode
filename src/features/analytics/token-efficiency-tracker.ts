import { join } from 'node:path';
import type {
  AnalyticsOptions,
  TokenEfficiencyReport,
  TokenEfficiencyTracker,
  TokenMetric,
} from './types.ts';
import { appendJsonl, readJsonl } from './writer.ts';
import { log } from '../../shared/logger.ts';

const TOKEN_METRICS_FILE = 'token-metrics.jsonl';

export function createTokenEfficiencyTracker(options: AnalyticsOptions): TokenEfficiencyTracker {
  const filePath = join(options.analyticsDir, TOKEN_METRICS_FILE);

  return {
    async track(metric: TokenMetric): Promise<void> {
      if (!options.enabled) return;
      try {
        await appendJsonl(filePath, metric as unknown as Record<string, unknown>);
      } catch (err: unknown) {
        log('[analytics] Failed to track token usage', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    async getReport(since?: number): Promise<TokenEfficiencyReport> {
      const metrics = readJsonl<TokenMetric>(filePath);
      const filtered = since !== undefined ? metrics.filter((m) => m.timestamp >= since) : metrics;

      const bySkillAccum: Record<string, { tokens: number[]; successes: number; total: number }> =
        {};
      let rawTokens = 0;
      let rawCount = 0;

      for (const m of filtered) {
        if (m.skillName !== null) {
          if (!bySkillAccum[m.skillName]) {
            bySkillAccum[m.skillName] = { tokens: [], successes: 0, total: 0 };
          }
          bySkillAccum[m.skillName].tokens.push(m.totalTokens);
          bySkillAccum[m.skillName].total++;
          if (m.success) bySkillAccum[m.skillName].successes++;
        } else {
          rawTokens += m.totalTokens;
          rawCount++;
        }
      }

      const bySkill: TokenEfficiencyReport['bySkill'] = {};
      let totalSkillTokens = 0;

      for (const [name, data] of Object.entries(bySkillAccum)) {
        const total = data.tokens.reduce((a, b) => a + b, 0);
        totalSkillTokens += total;
        bySkill[name] = {
          totalTokens: total,
          avgTokensPerInvocation:
            data.tokens.length > 0 ? Math.round(total / data.tokens.length) : 0,
          invocationCount: data.total,
          successRate: data.total > 0 ? data.successes / data.total : 0,
        };
      }

      const now = Date.now();
      return {
        period: {
          start: since ?? (filtered.length > 0 ? filtered[0].timestamp : now),
          end: now,
        },
        bySkill,
        rawConversation: {
          totalTokens: rawTokens,
          avgTokensPerMessage: rawCount > 0 ? Math.round(rawTokens / rawCount) : 0,
          messageCount: rawCount,
        },
        efficiencyRatio: rawTokens > 0 ? totalSkillTokens / rawTokens : 0,
      };
    },
  };
}
