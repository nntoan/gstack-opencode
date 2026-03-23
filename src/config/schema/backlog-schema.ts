import { z } from 'zod';

export const BacklogConfigSchema = z.object({
  enabled: z.boolean().default(true),
  auto_create_tasks: z.boolean().default(true),
  auto_update_status: z.boolean().default(true),
});

export type BacklogConfig = z.infer<typeof BacklogConfigSchema>;
