import type { McpToolInvoker } from '../skill-mcp-manager/index.ts';
import { createBacklogClient } from './backlog-client.ts';
import type { BacklogClient } from './backlog-client.ts';
import { createThinkPlanTaskCreator } from './think-plan-creator.ts';
import type { ThinkPlanTaskCreator } from './think-plan-creator.ts';
import { createBuildStatusUpdater } from './build-status-updater.ts';
import type { BuildStatusUpdater } from './build-status-updater.ts';
import { createShipReadinessChecker } from './ship-readiness-checker.ts';
import type { ShipReadinessChecker } from './ship-readiness-checker.ts';
import type { BacklogMcpAvailability } from './types.ts';

export type { BacklogTask, SprintContext, BacklogMcpAvailability } from './types.ts';
export type { BacklogClient } from './backlog-client.ts';
export { createBacklogClient } from './backlog-client.ts';
export { createThinkPlanTaskCreator } from './think-plan-creator.ts';
export { createBuildStatusUpdater } from './build-status-updater.ts';
export { createShipReadinessChecker } from './ship-readiness-checker.ts';
export { withBacklogFallback } from './graceful-degradation.ts';

export interface SprintBacklog {
  client: BacklogClient;
  taskCreator: ThinkPlanTaskCreator;
  statusUpdater: BuildStatusUpdater;
  shipChecker: ShipReadinessChecker;
  isAvailable(): Promise<BacklogMcpAvailability>;
}

export function createSprintBacklog(mcpTools: McpToolInvoker): SprintBacklog {
  const client = createBacklogClient(mcpTools);
  return {
    client,
    taskCreator: createThinkPlanTaskCreator(client),
    statusUpdater: createBuildStatusUpdater(client),
    shipChecker: createShipReadinessChecker(client),
    isAvailable: () => client.isAvailable(),
  };
}
