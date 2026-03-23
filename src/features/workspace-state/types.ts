import type { SprintPhase } from '../../types/agent.ts';

export interface TaskSessionState {
  task_key: string;
  task_label: string;
  task_title: string;
  session_id: string;
  agent?: string;
  category?: string;
  updated_at: string;
}

export interface BoulderState {
  active_plan: string;
  started_at: string;
  session_ids: string[];
  plan_name: string;
  agent?: string;
  current_phase?: SprintPhase;
  task_sessions?: Record<string, TaskSessionState>;
}

export interface PlanProgress {
  total: number;
  completed: number;
  isComplete: boolean;
}

export interface ReviewDashboardEntry {
  reviewType: 'eng' | 'ceo' | 'design';
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  reviewer?: string;
  timestamp: string;
  findings?: string[];
}

export interface SessionRecord {
  sessionId: string;
  startedAt: string;
  phase: SprintPhase;
  agent: string;
  status: 'active' | 'completed' | 'abandoned';
}
