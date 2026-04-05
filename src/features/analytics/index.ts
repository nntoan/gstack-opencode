export type {
  AnalyticsOptions,
  EurekaEvent,
  EurekaTracker,
  SkillUsageEvent,
  SkillUsageTracker,
  SprintLogEvent,
  SprintLogger,
  TokenEfficiencyReport,
  TokenEfficiencyTracker,
  TokenMetric,
} from './types.ts';

export { appendJsonl, readJsonl } from './writer.ts';
export { createEurekaTracker } from './eureka-tracker.ts';
export { createSkillUsageTracker } from './skill-usage-tracker.ts';
export { createSprintLogger } from './sprint-logger.ts';
export { createTokenEfficiencyTracker } from './token-efficiency-tracker.ts';

import type {
  AnalyticsOptions,
  EurekaTracker,
  SkillUsageTracker,
  SprintLogger,
  TokenEfficiencyTracker,
} from './types.ts';
import { createEurekaTracker } from './eureka-tracker.ts';
import { createSkillUsageTracker } from './skill-usage-tracker.ts';
import { createSprintLogger } from './sprint-logger.ts';
import { createTokenEfficiencyTracker } from './token-efficiency-tracker.ts';

export interface Analytics {
  skillUsage: SkillUsageTracker;
  eureka: EurekaTracker;
  sprintLog: SprintLogger;
  tokenEfficiency: TokenEfficiencyTracker;
}

export function createAnalytics(options: AnalyticsOptions): Analytics {
  return {
    skillUsage: createSkillUsageTracker(options),
    eureka: createEurekaTracker(options),
    sprintLog: createSprintLogger(options),
    tokenEfficiency: createTokenEfficiencyTracker(options),
  };
}
