import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import { log } from '../../shared/logger.ts';

export function createProgressHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
}): HookDefinition {
  const { workspaceState } = params;

  return {
    name: 'plan-progress-injector',
    event: 'system.transform',
    handler: async (_input: unknown, output: unknown): Promise<void> => {
      const safeOutput = output as { system?: unknown };
      if (!safeOutput?.system || !Array.isArray(safeOutput.system)) return;

      try {
        const company = workspaceState.company.readResolved();
        if (!company?.active_plan) return;

        const progress = workspaceState.plans.getProgress(company.active_plan);
        if (progress.total === 0) return;

        const pct = Math.round((progress.completed / progress.total) * 100);
        const progressLine = progress.isComplete
          ? `## Sprint Progress\n**Plan:** ${company.plan_name}\n**Status:** COMPLETE (${progress.completed}/${progress.total} tasks)`
          : `## Sprint Progress\n**Plan:** ${company.plan_name}\n**Progress:** ${progress.completed}/${progress.total} tasks (${pct}%)\n**Phase:** ${company.current_phase ?? 'unknown'}\n**Agent:** ${company.active_specialist ?? 'unknown'}`;

        safeOutput.system.push(progressLine);
      } catch (err: unknown) {
        log('[ERROR] progress-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
