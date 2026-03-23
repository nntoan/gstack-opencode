import { join } from 'node:path';
import type { AnalyticsOptions, SkillUsageEvent, SkillUsageTracker } from './types.ts';
import { appendJsonl, readJsonl } from './writer.ts';

export function createSkillUsageTracker(options: AnalyticsOptions): SkillUsageTracker {
  const filePath = join(options.analyticsDir, 'skill-usage.jsonl');

  return {
    record(event: SkillUsageEvent): void {
      if (!options.enabled) return;
      appendJsonl(filePath, event as unknown as Record<string, unknown>);
    },

    getRecent(limit: number): SkillUsageEvent[] {
      const all = readJsonl<SkillUsageEvent>(filePath);
      return all.slice(-limit);
    },
  };
}
