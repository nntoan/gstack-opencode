import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { tool } from '@opencode-ai/plugin/tool';
import type { ToolDefinition } from '@opencode-ai/plugin/tool';
import { getPlansDir } from '../../shared/path-helpers.ts';
import { log } from '../../shared/index.ts';
import type { Managers } from '../../create-managers.ts';
import { createBoulderState } from '../workspace-state/index.ts';
import { COMPANY_ARTIFACT_OWNERSHIP } from '../company/types.ts';

/**
 * Validates that a filename does not escape the expected directory.
 * Prevents path traversal attacks (e.g. "../../etc/passwd").
 */
function safePath(baseDir: string, filename: string): string {
  const resolved = resolve(baseDir, filename);
  if (!resolved.startsWith(baseDir)) {
    throw new Error(`Invalid filename: path traversal detected in "${filename}"`);
  }
  return resolved;
}

// ─── save-plan ───────────────────────────────────────────────────────────────

export function createSavePlanTool(directory: string, managers: Managers): ToolDefinition {
  return tool({
    description: 'Saves a plan document to .gstack/plans/{name}.md',
    args: {
      name: tool.schema.string().describe('Plan filename (without .md extension)'),
      content: tool.schema.string().describe('Markdown content of the plan'),
    },
    async execute(args, context) {
      const plansDir = getPlansDir(directory);

      try {
        const filePath = safePath(plansDir, `${args.name}.md`);
        mkdirSync(plansDir, { recursive: true });
        writeFileSync(filePath, args.content, 'utf-8');
        log('[save-plan] wrote plan', { name: args.name, path: filePath });

        // Initialize boulder state if none exists, so session continuity hooks activate
        const existingBoulder = managers.workspaceState.boulder.read();
        if (!existingBoulder) {
          const sessionId = context.sessionID ?? 'unknown';
          const boulderState = createBoulderState(filePath, sessionId);
          managers.workspaceState.boulder.write(boulderState);
          log('[save-plan] initialized boulder state for plan', { name: args.name });
        }

        const existingCompany = managers.workspaceState.company.read();
        if (!existingCompany) {
          const sessionId = context.sessionID ?? 'unknown';
          const nowIso = new Date().toISOString();
          managers.workspaceState.company.write({
            version: 1,
            visible_agent: 'company',
            source: 'canonical',
            active_plan: filePath,
            plan_name: args.name,
            started_at: nowIso,
            updated_at: nowIso,
            session_ids: [sessionId],
            ownership: COMPANY_ARTIFACT_OWNERSHIP,
          });
          log('[save-plan] initialized canonical company state for plan', { name: args.name });
        }

        return `Plan saved: .gstack/plans/${args.name}.md`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log('[save-plan] [ERROR] failed to write plan', { name: args.name, error: message });
        return `Error saving plan: ${message}`;
      }
    },
  });
}

// ─── load-plan ───────────────────────────────────────────────────────────────

export function createLoadPlanTool(directory: string): ToolDefinition {
  return tool({
    description: 'Loads a plan from .gstack/plans/. Omit name to list all available plans.',
    args: {
      name: tool.schema
        .string()
        .optional()
        .describe('Plan filename (without .md). Omit to list all plans.'),
    },
    async execute(args) {
      const plansDir = getPlansDir(directory);

      if (!args.name) {
        if (!existsSync(plansDir)) {
          return 'No plans directory found. No plans have been saved yet.';
        }

        try {
          const plans = readdirSync(plansDir)
            .filter((f) => f.endsWith('.md'))
            .map((f) => basename(f, '.md'));

          if (plans.length === 0) {
            return 'No plans found in .gstack/plans/';
          }

          return `Available plans:\n${plans.map((p) => `  - ${p}`).join('\n')}`;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return `Error listing plans: ${message}`;
        }
      }

      try {
        const filePath = safePath(plansDir, `${args.name}.md`);
        if (!existsSync(filePath)) {
          return `Plan not found: .gstack/plans/${args.name}.md`;
        }

        const content = readFileSync(filePath, 'utf-8');
        log('[load-plan] read plan', { name: args.name });
        return content;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error reading plan: ${message}`;
      }
    },
  });
}

// ─── plan-progress ───────────────────────────────────────────────────────────

export function createPlanProgressTool(managers: Managers): ToolDefinition {
  return tool({
    description: 'Shows checkbox completion progress for a plan',
    args: {
      name: tool.schema.string().describe('Plan filename (without .md extension)'),
    },
    async execute(args, context) {
      try {
        const plansDir = getPlansDir(context.directory);
        const planPath = safePath(plansDir, `${args.name}.md`);
        const progress = managers.workspaceState.plans.getProgress(planPath);

        if (progress.total === 0) {
          return `Plan "${args.name}": no checkboxes found (or plan does not exist).`;
        }

        const pct = Math.round((progress.completed / progress.total) * 100);
        const status = progress.isComplete ? ' ✓ COMPLETE' : '';
        return `Plan "${args.name}": ${progress.completed}/${progress.total} tasks completed (${pct}%)${status}`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error checking plan progress: ${message}`;
      }
    },
  });
}

// ─── notepad ─────────────────────────────────────────────────────────────────

export function createNotepadTool(managers: Managers): ToolDefinition {
  return tool({
    description: 'Read, write, or list scratchpad notes for a plan',
    args: {
      action: tool.schema
        .enum(['read', 'write', 'list'])
        .describe('Action to perform: read, write, or list categories'),
      plan: tool.schema.string().describe('Plan name (without .md extension)'),
      category: tool.schema
        .string()
        .optional()
        .describe('Note category (required for read/write, omit for list)'),
      content: tool.schema.string().optional().describe('Content to append (required for write)'),
    },
    async execute(args) {
      const notepad = managers.workspaceState.notepads(args.plan);

      if (args.action === 'list') {
        try {
          const files = await notepad.list();
          const categories = files.map((f) => basename(f, '.md'));
          if (categories.length === 0) {
            return `No notepad entries found for plan "${args.plan}".`;
          }

          return `Notepad categories for "${args.plan}":\n${categories.map((c) => `  - ${c}`).join('\n')}`;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return `Error listing notepad: ${message}`;
        }
      }

      if (!args.category) {
        return 'Error: category is required for read/write actions.';
      }

      if (args.action === 'read') {
        try {
          const content = await notepad.read(args.category);
          if (!content) {
            return `No notepad entry for category "${args.category}" in plan "${args.plan}".`;
          }

          return content;
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return `Error reading notepad: ${message}`;
        }
      }

      // write
      if (!args.content) {
        return 'Error: content is required for write action.';
      }

      try {
        await notepad.write(args.category, args.content);
        log('[notepad] wrote entry', { plan: args.plan, category: args.category });
        return `Notepad entry written to "${args.plan}/${args.category}".`;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error writing notepad: ${message}`;
      }
    },
  });
}

// ─── sprint-status ───────────────────────────────────────────────────────────

export function createSprintStatusTool(managers: Managers): ToolDefinition {
  return tool({
    description: 'Shows current sprint state including active plan, sessions, and review status',
    args: {},
    async execute() {
      const lines: string[] = ['## Sprint Status'];

      const company = managers.workspaceState.company.readResolved();
      if (company) {
        lines.push(`\n**Active Plan:** ${company.plan_name ?? 'unknown'}`);
        lines.push(`**Phase:** ${company.current_phase ?? 'unknown'}`);
        lines.push(`**Agent:** ${company.active_specialist ?? 'none'}`);
        lines.push(`**Started:** ${company.started_at}`);
        lines.push(`**Sessions:** ${company.session_ids.length}`);
      } else {
        lines.push('\n**No active sprint.** No boulder state found.');
      }

      // Active sessions
      try {
        const activeSessions = await managers.workspaceState.sessions.getActive();
        if (activeSessions.length > 0) {
          lines.push(`\n**Active Sessions:** ${activeSessions.length}`);
          for (const session of activeSessions) {
            lines.push(`  - ${session.sessionId} (${session.agent}, ${session.phase})`);
          }
        }
      } catch (err: unknown) {
        log('[sprint-status] [ERROR] failed to read sessions', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Review status
      try {
        const reviews = await managers.workspaceState.reviews.getStatus();
        if (reviews.length > 0) {
          lines.push(`\n**Reviews (${reviews.length}):**`);
          for (const r of reviews) {
            const findings = r.findings?.length ? ` — ${r.findings.join(', ')}` : '';
            lines.push(`  - ${r.reviewType}: ${r.status}${findings}`);
          }
        }

        const readiness = await managers.workspaceState.reviews.isShipReady();
        lines.push(`\n**Ship Readiness:** ${readiness.ready ? '✓ Ready' : '✗ Not ready'}`);
        if (!readiness.ready && readiness.missing.length > 0) {
          lines.push(`**Missing:** ${readiness.missing.join(', ')}`);
        }
      } catch (err: unknown) {
        log('[sprint-status] [ERROR] failed to read reviews', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      return lines.join('\n');
    },
  });
}

// ─── record-review ───────────────────────────────────────────────────────────

export function createRecordReviewTool(managers: Managers): ToolDefinition {
  return tool({
    description: 'Records a review verdict (eng, ceo, or design) to the review dashboard',
    args: {
      reviewType: tool.schema
        .enum(['eng', 'ceo', 'design'])
        .describe('The type of review being recorded'),
      status: tool.schema
        .enum(['passed', 'failed', 'skipped'])
        .describe('The outcome of the review'),
      reviewer: tool.schema.string().optional().describe('Name or ID of the reviewer'),
      findings: tool.schema
        .string()
        .optional()
        .describe('Comma-separated findings or notes from the review'),
    },
    async execute(args) {
      const findingsList = args.findings
        ? args.findings
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : undefined;

      try {
        const updated = await managers.workspaceState.reviews.record({
          reviewType: args.reviewType,
          status: args.status,
          reviewer: args.reviewer,
          timestamp: new Date().toISOString(),
          findings: findingsList,
        });

        const readiness = await managers.workspaceState.reviews.isShipReady();
        const reviewCount = updated.length;
        const shipLine = readiness.ready
          ? '✓ Ship-ready'
          : `✗ Not ready — missing: ${readiness.missing.join(', ')}`;

        log('[record-review] recorded', { reviewType: args.reviewType, status: args.status });
        return [
          `Review recorded: ${args.reviewType} — ${args.status}`,
          `Total reviews: ${reviewCount}`,
          `Readiness: ${shipLine}`,
        ].join('\n');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log('[record-review] [ERROR] failed to record', { error: message });
        return `Error recording review: ${message}`;
      }
    },
  });
}

// ─── ship-readiness ──────────────────────────────────────────────────────────

export function createShipReadinessTool(managers: Managers): ToolDefinition {
  return tool({
    description:
      'Checks if the current sprint is ready to ship based on review status and plan completion',
    args: {},
    async execute() {
      const lines: string[] = ['## Ship Readiness Check'];

      try {
        const readiness = await managers.workspaceState.reviews.isShipReady();

        if (readiness.ready) {
          lines.push('\n✓ **Ready to ship.**');
        } else {
          lines.push('\n✗ **Not ready to ship.**');
          lines.push(`\n**Missing requirements:**`);
          for (const item of readiness.missing) {
            lines.push(`  - ${item}`);
          }
        }

        const reviews = await managers.workspaceState.reviews.getStatus();
        if (reviews.length > 0) {
          lines.push(`\n**Review history (${reviews.length}):**`);
          for (const r of reviews) {
            const reviewer = r.reviewer ? ` by ${r.reviewer}` : '';
            lines.push(`  - ${r.reviewType}: ${r.status}${reviewer} (${r.timestamp})`);
          }
        } else {
          lines.push('\n_No reviews recorded._');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log('[ship-readiness] [ERROR] failed to check readiness', { error: message });
        return `Error checking ship readiness: ${message}`;
      }

      return lines.join('\n');
    },
  });
}
