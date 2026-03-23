export type {
  AnalyticsOptions,
  EurekaEvent,
  EurekaTracker,
  SkillUsageEvent,
  SkillUsageTracker,
  SprintLogEvent,
  SprintLogger,
} from './types.ts';

export { appendJsonl, readJsonl } from './writer.ts';
export { createEurekaTracker } from './eureka-tracker.ts';
export { createSkillUsageTracker } from './skill-usage-tracker.ts';
export { createSprintLogger } from './sprint-logger.ts';

import type { AnalyticsOptions, EurekaTracker, SkillUsageTracker, SprintLogger } from './types.ts';
import { createEurekaTracker } from './eureka-tracker.ts';
import { createSkillUsageTracker } from './skill-usage-tracker.ts';
import { createSprintLogger } from './sprint-logger.ts';

export interface Analytics {
  skillUsage: SkillUsageTracker;
  eureka: EurekaTracker;
  sprintLog: SprintLogger;
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  return {
    skillUsage: createSkillUsageTracker(options),
    eureka: createEurekaTracker(options),
    sprintLog: createSprintLogger(options),
  };
}
