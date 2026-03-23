import type { BacklogClient } from './backlog-client.ts';
import type { BacklogTask } from './types.ts';

export interface ShipReadinessChecker {
  check(): Promise<{
    ready: boolean;
    pendingTasks: BacklogTask[];
    completionPercentage: number;
  }>;
}

export function createShipReadinessChecker(client: BacklogClient): ShipReadinessChecker {
  return {
    async check(): Promise<{
      ready: boolean;
      pendingTasks: BacklogTask[];
      completionPercentage: number;
    }> {
      const tasks = await client.listTasks({});
      const pendingTasks = tasks.filter(
        (task) => task.status !== 'done' && task.status !== 'archived'
      );
      const doneCount = tasks.filter((task) => task.status === 'done').length;
      const totalCount = tasks.length;
      const completionPercentage =
        totalCount === 0 ? 100 : Math.round((doneCount / totalCount) * 100);

      return {
        ready: pendingTasks.length === 0,
        pendingTasks,
        completionPercentage,
      };
    },
  };
}
