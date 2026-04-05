import type { Managers } from '../../create-managers.ts';
import {
  createSavePlanTool,
  createLoadPlanTool,
  createPlanProgressTool,
  createNotepadTool,
  createSprintStatusTool,
  createRecordReviewTool,
  createShipReadinessTool,
} from './sprint-tools.ts';

export function createSprintTools(params: {
  directory: string;
  managers: Managers;
}): Record<string, unknown> {
  const { directory, managers } = params;

  return {
    'save-plan': createSavePlanTool(directory, managers),
    'load-plan': createLoadPlanTool(directory),
    'plan-progress': createPlanProgressTool(managers),
    notepad: createNotepadTool(managers),
    'sprint-status': createSprintStatusTool(managers),
    'record-review': createRecordReviewTool(managers),
    'ship-readiness': createShipReadinessTool(managers),
  };
}
