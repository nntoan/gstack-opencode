import type { McpToolInvoker } from '../skill-mcp-manager/index.ts';
import { withBacklogFallback } from './graceful-degradation.ts';
import type { BacklogMcpAvailability, BacklogTask, BacklogTaskStatus } from './types.ts';

interface CreateTaskOptions {
  priority?: BacklogTask['priority'];
  assignee?: string;
  dependencies?: string[];
  definitionOfDone?: string[];
  implementationPlan?: string;
}

export interface BacklogClient {
  isAvailable(): Promise<BacklogMcpAvailability>;
  createTask(_title: string, _opts?: CreateTaskOptions): Promise<BacklogTask | null>;
  updateStatus(_taskId: string, _status: BacklogTaskStatus): Promise<boolean>;
  listTasks(_filter?: Record<string, unknown>): Promise<BacklogTask[]>;
  archiveTask(_taskId: string): Promise<boolean>;
}

function toBacklogTask(value: unknown): BacklogTask | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const { id, title, status, priority } = record;

  if (
    typeof id !== 'string' ||
    typeof title !== 'string' ||
    (status !== 'todo' && status !== 'in-progress' && status !== 'done' && status !== 'archived') ||
    (priority !== 'p0' && priority !== 'p1' && priority !== 'p2')
  ) {
    return null;
  }

  return {
    id,
    title,
    status,
    priority,
    assignee: typeof record.assignee === 'string' ? record.assignee : undefined,
    dependencies: Array.isArray(record.dependencies)
      ? record.dependencies.filter((dep): dep is string => typeof dep === 'string')
      : undefined,
    definitionOfDone: Array.isArray(record.definitionOfDone)
      ? record.definitionOfDone.filter((item): item is string => typeof item === 'string')
      : undefined,
    implementationPlan:
      typeof record.implementationPlan === 'string' ? record.implementationPlan : undefined,
  };
}

function toBacklogTasks(value: unknown): BacklogTask[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toBacklogTask(item))
    .filter((task): task is BacklogTask => task !== null);
}

export function createBacklogClient(mcpTools: McpToolInvoker): BacklogClient {
  return {
    async isAvailable(): Promise<BacklogMcpAvailability> {
      return withBacklogFallback<BacklogMcpAvailability>(
        async () => {
          await mcpTools.invoke('backlog_md', 'backlog_task_list', {});
          return { available: true };
        },
        { available: false, reason: 'MCP invocation failed' },
        'backlog-client.isAvailable'
      );
    },

    async createTask(title: string, opts: CreateTaskOptions = {}): Promise<BacklogTask | null> {
      return withBacklogFallback(
        async () => {
          const result = await mcpTools.invoke('backlog_md', 'backlog_task_create', {
            title,
            ...opts,
          });
          return toBacklogTask(result);
        },
        null,
        'backlog-client.createTask'
      );
    },

    async updateStatus(taskId: string, status: BacklogTaskStatus): Promise<boolean> {
      return withBacklogFallback(
        async () => {
          await mcpTools.invoke('backlog_md', 'backlog_task_edit', { id: taskId, status });
          return true;
        },
        false,
        'backlog-client.updateStatus'
      );
    },

    async listTasks(filter: Record<string, unknown> = {}): Promise<BacklogTask[]> {
      return withBacklogFallback(
        async () => {
          const result = await mcpTools.invoke('backlog_md', 'backlog_task_list', filter ?? {});
          return toBacklogTasks(result);
        },
        [],
        'backlog-client.listTasks'
      );
    },

    async archiveTask(taskId: string): Promise<boolean> {
      return withBacklogFallback(
        async () => {
          await mcpTools.invoke('backlog_md', 'backlog_task_archive', { id: taskId });
          return true;
        },
        false,
        'backlog-client.archiveTask'
      );
    },
  };
}
