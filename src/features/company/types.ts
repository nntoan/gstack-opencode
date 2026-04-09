import type { AgentRole, SprintPhase } from '../../types/agent.ts';

/**
 * Canonical Company artifact ownership declaration.
 * Lists all files and directories owned and managed exclusively by The Company.
 */
export interface CompanyArtifactOwnership {
  /** Mutable snapshot of Company orchestration state */
  snapshot: 'state.json';
  /** Append-only structured log of Company orchestration events */
  log: 'sprint-log.jsonl';
  /** Recovery checkpoint files stored under the checkpoints sub-directory */
  checkpoints: 'checkpoints/';
}

/**
 * The canonical source origin of Company runtime state.
 * - 'canonical' — state was produced by the current Company storage layer
 * - 'legacy-boulder' — state was synthesized from the legacy boulder.json artifact
 */
export type CompanyStateSource = 'canonical' | 'legacy-boulder';

export type DecisionWaitStatus = 'pending' | 'answered' | 'archived';

export interface DeferredClassifiedIntent {
  phase: SprintPhase;
  confidence: number;
  suggested_agent: AgentRole;
  suggested_skills: string[];
  reasoning: string;
}

export interface DecisionWait {
  id: string;
  workflow_id: string;
  checkpoint_id: string;
  question: string;
  phase: SprintPhase;
  status: DecisionWaitStatus;
  created_at: string;
  answered_at?: string;
  answer?: string;
}

export interface CompanyVisibleContext {
  current_goal?: string;
  current_step?: string;
  status_summary?: string;
  pending_user_decision?: string;
  deferred_request_text?: string;
}

export interface CompanyExecutionContext {
  specialist_role?: string;
  classified_phase?: SprintPhase;
  confidence?: number;
  trace_visibility?: 'hidden' | 'debug';
  retry_safe?: boolean;
  retry_reason?: string;
  deferred_classified_intent?: DeferredClassifiedIntent;
}

export interface CompanyRetryLineage {
  parent_workflow_id?: string;
  current_attempt: number;
  child_attempt_ids: string[];
  safe_retry_checkpoint_ids: string[];
  last_retry_checkpoint_id?: string;
}

/**
 * Canonical Company runtime snapshot.
 * This is the source-of-truth orchestration state for The Company.
 */
export interface CompanyState {
  /** Schema version — always 1 for this contract */
  version: 1;
  /** Public-facing identity of the visible orchestrator agent */
  visible_agent: 'company';
  /** Origin of this state record — canonical or migrated from legacy boulder */
  source: CompanyStateSource;
  /** ISO 8601 timestamp when orchestration began */
  started_at: string;
  /** ISO 8601 timestamp of the last write */
  updated_at: string;
  /** All OpenCode session IDs participating in this orchestration context */
  session_ids: string[];
  /** Path to the currently active plan, if any */
  active_plan?: string;
  /** Human-readable name of the active plan, if any */
  plan_name?: string;
  /** Current sprint lifecycle phase */
  current_phase?: SprintPhase;
  /** Role key of the specialist the Company has delegated to, if any */
  active_specialist?: string;
  workflow_id?: string;
  current_attempt?: number;
  /** ID of the last recovery checkpoint written, if any */
  last_checkpoint_id?: string;
  visible_context?: CompanyVisibleContext;
  execution_context?: CompanyExecutionContext;
  retry_lineage?: CompanyRetryLineage;
  pending_decision_wait?: DecisionWait;
  archived_decision_waits?: DecisionWait[];
  /** Canonical artifact ownership declaration for downstream consumers */
  ownership: CompanyArtifactOwnership;
}

/**
 * A single structured entry appended to the Company's sprint-log.jsonl.
 */
export interface CompanyLogEntry {
  /** ISO 8601 timestamp */
  ts: string;
  /** Event type label */
  event: string;
  /** Optional structured payload */
  data?: Record<string, unknown>;
}

/**
 * An envelope for a Company recovery checkpoint file.
 * Written as a JSON file under .gstack/orchestrator/checkpoints/{id}.json
 */
export interface CompanyCheckpoint {
  /** Unique checkpoint identifier */
  id: string;
  /** ISO 8601 timestamp when the checkpoint was captured */
  captured_at: string;
  /** Company state snapshot at the time of checkpoint */
  state: CompanyState;
  /** Optional human-readable description of why the checkpoint was created */
  reason?: string;
}

/**
 * The canonical Company artifact ownership instance.
 * Embed in CompanyState to make ownership machine-legible.
 */
export const COMPANY_ARTIFACT_OWNERSHIP: CompanyArtifactOwnership = {
  snapshot: 'state.json',
  log: 'sprint-log.jsonl',
  checkpoints: 'checkpoints/',
};
