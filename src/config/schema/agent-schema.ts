import { z } from 'zod';

export const AgentOverrideSchema = z.object({
  model: z.string().optional(),
  instructions: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const AgentOverridesSchema = z.record(z.string(), AgentOverrideSchema);

export type AgentOverride = z.infer<typeof AgentOverrideSchema>;
export type AgentOverrides = z.infer<typeof AgentOverridesSchema>;
