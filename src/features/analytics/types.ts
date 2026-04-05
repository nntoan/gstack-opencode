import type { SprintPhase } from '../../types/agent.ts';

export interface SkillUsageEvent {
  timestamp: string;
  skillName: string;
  duration: number;
  success: boolean;
  phase?: SprintPhase;
  version: string;
}

export interface EurekaEvent {
  timestamp: string;
  skillName: string;
  insight: string;
  category: 'learning' | 'bug' | 'optimization' | 'pattern';
}

export interface SprintLogEvent {
  timestamp: string;
  phase: SprintPhase;
  action: 'started' | 'completed' | 'skipped';
  agent?: string;
  taskId?: string;
}

export interface AnalyticsOptions {
  analyticsDir: string;
  enabled: boolean;
}

export interface TokenMetric {
  timestamp: number;
  sessionId: string;
  skillName: string | null; // null = raw conversation (no skill)
  phase: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  duration_ms: number;
  success: boolean;
}

export interface TokenEfficiencyReport {
  period: { start: number; end: number };
  bySkill: Record<
    string,
    {
      totalTokens: number;
      avgTokensPerInvocation: number;
      invocationCount: number;
      successRate: number;
    }
  >;
  rawConversation: {
    totalTokens: number;
    avgTokensPerMessage: number;
    messageCount: number;
  };
  efficiencyRatio: number; // skill tokens / raw tokens (lower is better)
}

export interface TokenEfficiencyTracker {
  track(metric: TokenMetric): Promise<void>;
  getReport(since?: number): Promise<TokenEfficiencyReport>;
}

export interface SkillUsageTracker {
  record(event: SkillUsageEvent): void;
  getRecent(limit: number): SkillUsageEvent[];
}

export interface EurekaTracker {
  record(event: EurekaEvent): void;
  getInsights(skillName?: string): EurekaEvent[];
}

export interface SprintLogger {
  log(event: SprintLogEvent): void;
  getPhaseHistory(): SprintLogEvent[];
}
