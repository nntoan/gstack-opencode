import { join } from 'node:path';
import type { AnalyticsOptions, EurekaEvent, EurekaTracker } from './types.ts';
import { appendJsonl, readJsonl } from './writer.ts';

export function createEurekaTracker(options: AnalyticsOptions): EurekaTracker {
  const filePath = join(options.analyticsDir, 'eureka.jsonl');

  return {
    record(event: EurekaEvent): void {
      if (!options.enabled) return;
      appendJsonl(filePath, event as unknown as Record<string, unknown>);
    },

    getInsights(skillName?: string): EurekaEvent[] {
      const all = readJsonl<EurekaEvent>(filePath);
      if (skillName === undefined) return all;
      return all.filter((e) => e.skillName === skillName);
    },
  };
}
