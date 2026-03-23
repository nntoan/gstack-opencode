import { z } from 'zod';

export const BrowserConfigSchema = z.object({
  headless: z.boolean().default(true),
  timeout_ms: z.number().default(30000),
});

export type BrowserConfig = z.infer<typeof BrowserConfigSchema>;
