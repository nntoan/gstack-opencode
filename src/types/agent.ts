export type SprintPhase =
  | 'think'
  | 'plan'
  | 'build'
  | 'review'
  | 'test'
  | 'ship'
  | 'reflect'
  | 'cross-cutting'
  | 'utility';

export type AgentRole =
  | 'ceo'
  | 'eng-manager'
  | 'designer'
  | 'builder'
  | 'reviewer'
  | 'debugger'
  | 'qa-lead'
  | 'release-engineer'
  | 'doc-engineer'
  | 'retro-lead'
  | 'safety-guard'
  | 'upgrader'
  | 'session-manager'
  | 'company';

export interface GstackAgent {
  role: AgentRole;
  name: string;
  description: string;
  sprintPhase: SprintPhase;
  skills: string[];
  instructions: string;
  model?: string;
  subtask?: boolean;
}
