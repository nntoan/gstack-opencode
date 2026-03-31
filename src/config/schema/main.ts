import { z } from 'zod';
import { AgentOverridesSchema } from './agent-schema.ts';
import { McpConfigSchema } from './mcp-schema.ts';
import { BacklogConfigSchema } from './backlog-schema.ts';
import { BrowserConfigSchema } from './browser-schema.ts';
import { TelemetryConfigSchema } from './telemetry-schema.ts';

const InstallSelectionSchema = z.object({
  claude_plan: z.enum(['none', 'pro', 'max']).optional(),
  has_openai: z.boolean().optional(),
  has_gemini: z.boolean().optional(),
  has_copilot: z.boolean().optional(),
  has_opencode_zen: z.boolean().optional(),
  has_zai_coding_plan: z.boolean().optional(),
  has_kimi_for_coding: z.boolean().optional(),
  has_opencode_go: z.boolean().optional(),
});

export const GstackConfigSchema = z
  .object({
    orchestration_mode: z.enum(['multi-agent', 'skills-only']).default('multi-agent'),
    disabled_skills: z.array(z.string()).default([]),
    disabled_agents: z.array(z.string()).default([]),
    disabled_mcps: z.array(z.string()).default([]),
    disabled_hooks: z.array(z.string()).default([]),
    install_selection: InstallSelectionSchema.optional(),
    agents: AgentOverridesSchema.optional(),
    mcp: McpConfigSchema.optional(),
    backlog: BacklogConfigSchema.optional(),
    browser: BrowserConfigSchema.optional(),
    telemetry: TelemetryConfigSchema.optional(),
  })
  .transform((data) => ({
    ...data,
    backlog: data.backlog || {
      enabled: true,
      auto_create_tasks: true,
      auto_update_status: true,
    },
  }));

export type GstackConfigOutput = z.infer<typeof GstackConfigSchema>;
