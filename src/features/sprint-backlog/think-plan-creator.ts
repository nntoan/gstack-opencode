import type { BacklogClient } from './backlog-client.ts';
import type { BacklogTask } from './types.ts';

export interface ThinkPlanTaskCreator {
  createSprintTasks(planName: string, objectives: string[]): Promise<BacklogTask[]>;
}

export function createThinkPlanTaskCreator(client: BacklogClient): ThinkPlanTaskCreator {
  return {
    async createSprintTasks(planName: string, objectives: string[]): Promise<BacklogTask[]> {
      void planName;
      const availability = await client.isAvailable();
      if (!availability.available) {
        return [];
      }

      const createdTasks: BacklogTask[] = [];
      for (const objective of objectives) {
        const task = await client.createTask(objective, { priority: 'p1' });
        if (task) {
          createdTasks.push(task);
        }
      }

      return createdTasks;
    },
  };
}
