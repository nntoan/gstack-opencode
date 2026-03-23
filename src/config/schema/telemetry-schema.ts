import { z } from 'zod';

export const TelemetryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  supabase: z
    .object({
      url: z.string().optional(),
      key: z.string().optional(),
    })
    .optional(),
});

export type TelemetryConfig = z.infer<typeof TelemetryConfigSchema>;
