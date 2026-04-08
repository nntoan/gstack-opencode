import { COMPANY_ARTIFACT_OWNERSHIP } from './types.ts';
import type { CompanyLogEntry, CompanyState } from './types.ts';
import type { BoulderState } from '../workspace-state/types.ts';

export function migrateBoulderStateToCompanyState(
  boulder: BoulderState,
  nowIso: string
): CompanyState {
  const state: CompanyState = {
    version: 1,
    visible_agent: 'company',
    source: 'legacy-boulder',
    started_at: boulder.started_at,
    updated_at: nowIso,
    session_ids: Array.isArray(boulder.session_ids) ? [...boulder.session_ids] : [],
    ownership: COMPANY_ARTIFACT_OWNERSHIP,
  };

  if (boulder.active_plan !== undefined) {
    state.active_plan = boulder.active_plan;
  }
  if (boulder.plan_name !== undefined) {
    state.plan_name = boulder.plan_name;
  }
  if (boulder.current_phase !== undefined) {
    state.current_phase = boulder.current_phase;
  }
  if (boulder.agent !== undefined) {
    state.active_specialist = boulder.agent;
  }

  return state;
}

export function createCompanyMigrationLogEntry(sessionId: string, nowIso: string): CompanyLogEntry {
  return {
    ts: nowIso,
    event: 'migration',
    data: {
      kind: 'migration',
      source_artifact: 'boulder.json',
      session_id: sessionId,
    },
  };
}
