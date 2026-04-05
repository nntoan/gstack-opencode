import type { HookDefinition } from '../../types/hooks.ts';
import type { createWorkspaceState } from '../workspace-state/index.ts';
import type { Analytics } from '../analytics/index.ts';
import { log } from '../../shared/logger.ts';

export function createScorecardHook(params: {
  workspaceState: ReturnType<typeof createWorkspaceState>;
  analytics: Analytics;
}): HookDefinition {
  const { workspaceState, analytics } = params;

  return {
    name: 'quality-scorecard',
    event: 'system.transform',
    handler: async (_input: unknown, output: unknown): Promise<void> => {
      const safeOutput = output as { system?: unknown };
      if (!safeOutput?.system || !Array.isArray(safeOutput.system)) return;

      try {
        const sections: string[] = [];

        // Review dashboard status
        const reviews = await workspaceState.reviews.getStatus();
        if (reviews.length > 0) {
          const reviewLines = reviews.map(
            (r) => `- ${r.reviewType}: ${r.status}${r.reviewer ? ` (${r.reviewer})` : ''}`
          );
          sections.push(`**Reviews:**\n${reviewLines.join('\n')}`);
        }

        // Ship readiness
        const readiness = await workspaceState.reviews.isShipReady();
        if (!readiness.ready && readiness.missing.length > 0) {
          sections.push(`**Ship Blockers:** ${readiness.missing.join(', ')}`);
        } else if (readiness.ready) {
          sections.push('**Ship Status:** Ready to ship');
        }

        // Recent skill usage
        const recentSkills = analytics.skillUsage.getRecent(5);
        if (recentSkills.length > 0) {
          const skillSummary = recentSkills
            .map((s) => `${s.skillName} (${s.success ? 'ok' : 'fail'})`)
            .join(', ');
          sections.push(`**Recent Skills:** ${skillSummary}`);
        }

        // Sprint phase history
        const phaseHistory = analytics.sprintLog.getPhaseHistory();
        if (phaseHistory.length > 0) {
          const recent = phaseHistory.slice(-3);
          const phaseSummary = recent.map((p) => `${p.phase}:${p.action}`).join(' -> ');
          sections.push(`**Phase Trail:** ${phaseSummary}`);
        }

        if (sections.length > 0) {
          const scorecard = `## Quality Scorecard\n\n${sections.join('\n\n')}`;
          safeOutput.system.push(scorecard);
        }
      } catch (err: unknown) {
        log('[ERROR] scorecard-hook failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  };
}
