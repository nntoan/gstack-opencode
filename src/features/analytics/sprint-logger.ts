import { join, resolve } from 'node:path';
import type { AnalyticsOptions, SprintLogEvent, SprintLogger } from './types.ts';
import { appendJsonl, readJsonl } from './writer.ts';

function getSprintLogPath(analyticsDir: string): string {
  // Go up one level from analyticsDir into orchestrator/
  const parentDir = resolve(analyticsDir, '..');
  return join(parentDir, 'orchestrator', 'sprint-log.jsonl');
}

export function createSprintLogger(options: AnalyticsOptions): SprintLogger {
  const filePath = getSprintLogPath(options.analyticsDir);

  return {
    log(event: SprintLogEvent): void {
      if (!options.enabled) return;
      appendJsonl(filePath, event as unknown as Record<string, unknown>);
    },

    getPhaseHistory(): SprintLogEvent[] {
      return readJsonl<SprintLogEvent>(filePath);
    },
  };
}
