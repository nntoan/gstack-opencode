import { describe, it, expect } from 'vitest';
import { createBacklogClient } from './backlog-client.ts';
import { createThinkPlanTaskCreator } from './think-plan-creator.ts';
import { createShipReadinessChecker } from './ship-readiness-checker.ts';
import { withBacklogFallback } from './graceful-degradation.ts';
import { createSprintBacklog } from './index.ts';
import type { BacklogClient } from './backlog-client.ts';
import type { McpToolInvoker } from '../skill-mcp-manager/index.ts';

function createRejectingInvoker(): McpToolInvoker {
  return {
    async invoke(): Promise<unknown> {
      throw new Error('MCP unavailable');
    },
  };
}

describe('sprint-backlog', () => {
  it('BacklogClient.isAvailable returns false when MCP invoke throws', async () => {
    const client = createBacklogClient(createRejectingInvoker());

    const result = await client.isAvailable();

    expect(result).toEqual({ available: false, reason: 'MCP invocation failed' });
  });

  it('BacklogClient.createTask returns null when MCP unavailable', async () => {
    const client = createBacklogClient(createRejectingInvoker());

    const result = await client.createTask('Task A', { priority: 'p1' });

    expect(result).toBeNull();
  });

  it('BacklogClient.listTasks returns [] when MCP unavailable', async () => {
    const client = createBacklogClient(createRejectingInvoker());

    const result = await client.listTasks();

    expect(result).toEqual([]);
  });

  it('ThinkPlanTaskCreator.createSprintTasks returns [] when client unavailable', async () => {
    const unavailableClient: BacklogClient = {
      async isAvailable() {
        return { available: false, reason: 'MCP invocation failed' };
      },
      async createTask() {
        return null;
      },
      async updateStatus() {
        return false;
      },
      async listTasks() {
        return [];
      },
      async archiveTask() {
        return false;
      },
    };

    const creator = createThinkPlanTaskCreator(unavailableClient);
    const result = await creator.createSprintTasks('plan-x', ['Obj A', 'Obj B']);

    expect(result).toEqual([]);
  });

  it('ShipReadinessChecker.check returns ready=true and 100% when all tasks done', async () => {
    const doneClient: BacklogClient = {
      async isAvailable() {
        return { available: true };
      },
      async createTask() {
        return null;
      },
      async updateStatus() {
        return true;
      },
      async listTasks() {
        return [
          { id: '1', title: 'A', status: 'done', priority: 'p1' },
          { id: '2', title: 'B', status: 'done', priority: 'p1' },
        ];
      },
      async archiveTask() {
        return true;
      },
    };

    const checker = createShipReadinessChecker(doneClient);
    const result = await checker.check();

    expect(result.ready).toBe(true);
    expect(result.completionPercentage).toBe(100);
    expect(result.pendingTasks).toHaveLength(0);
  });

  it('ShipReadinessChecker.check returns ready=false with 50% and 1 pending', async () => {
    const mixedClient: BacklogClient = {
      async isAvailable() {
        return { available: true };
      },
      async createTask() {
        return null;
      },
      async updateStatus() {
        return true;
      },
      async listTasks() {
        return [
          { id: '1', title: 'Done task', status: 'done', priority: 'p1' },
          { id: '2', title: 'Todo task', status: 'todo', priority: 'p1' },
        ];
      },
      async archiveTask() {
        return true;
      },
    };

    const checker = createShipReadinessChecker(mixedClient);
    const result = await checker.check();

    expect(result.ready).toBe(false);
    expect(result.completionPercentage).toBe(50);
    expect(result.pendingTasks).toHaveLength(1);
  });

  it('withBacklogFallback returns fallback when operation throws', async () => {
    const result = await withBacklogFallback(
      async () => {
        throw new Error('boom');
      },
      { ok: false },
      'test.context'
    );

    expect(result).toEqual({ ok: false });
  });

  it('createSprintBacklog returns all required components', async () => {
    const sprintBacklog = createSprintBacklog(createRejectingInvoker());

    expect(typeof sprintBacklog.client.isAvailable).toBe('function');
    expect(typeof sprintBacklog.taskCreator.createSprintTasks).toBe('function');
    expect(typeof sprintBacklog.statusUpdater.markInProgress).toBe('function');
    expect(typeof sprintBacklog.statusUpdater.markDone).toBe('function');
    expect(typeof sprintBacklog.statusUpdater.recordBlocker).toBe('function');
    expect(typeof sprintBacklog.shipChecker.check).toBe('function');

    const availability = await sprintBacklog.isAvailable();
    expect(availability.available).toBe(false);
  });

  it('full graceful degradation works with rejecting MCP invoker', async () => {
    const sprintBacklog = createSprintBacklog(createRejectingInvoker());

    const availability = await sprintBacklog.isAvailable();
    const tasks = await sprintBacklog.client.listTasks({});

    expect(availability).toEqual({ available: false, reason: 'MCP invocation failed' });
    expect(tasks).toEqual([]);
  });
});
