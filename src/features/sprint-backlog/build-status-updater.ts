import type { AgentRole } from '../../types/agent.ts';
import type { BacklogClient } from './backlog-client.ts';

export interface BuildStatusUpdater {
  markInProgress(taskId: string, agent: AgentRole): Promise<void>;
  markDone(taskId: string, agent: AgentRole): Promise<void>;
  recordBlocker(taskId: string, reason: string): Promise<void>;
}

export function createBuildStatusUpdater(client: BacklogClient): BuildStatusUpdater {
  return {
    async markInProgress(taskId: string, _agent: AgentRole): Promise<void> {
      await client.updateStatus(taskId, 'in-progress');
    },

    async markDone(taskId: string, _agent: AgentRole): Promise<void> {
      await client.updateStatus(taskId, 'done');
    },

    async recordBlocker(taskId: string, _reason: string): Promise<void> {
      await client.updateStatus(taskId, 'todo');
    },
  };
}
