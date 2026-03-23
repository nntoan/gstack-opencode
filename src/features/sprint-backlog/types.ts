import type { SprintPhase } from '../../types/agent.ts';

export type BacklogTaskStatus = 'todo' | 'in-progress' | 'done' | 'archived';
export type BacklogTaskPriority = 'p0' | 'p1' | 'p2';

export interface BacklogTask {
  id: string;
  title: string;
  status: BacklogTaskStatus;
  priority: BacklogTaskPriority;
  assignee?: string;
  dependencies?: string[];
  definitionOfDone?: string[];
  implementationPlan?: string;
}

export interface SprintContext {
  sprintId: string;
  phase: SprintPhase;
  activeTasks: BacklogTask[];
  completedTasks: BacklogTask[];
}

export interface BacklogMcpAvailability {
  available: boolean;
  reason?: string;
}
