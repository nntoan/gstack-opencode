import { z } from 'zod';

export const WebsearchMcpSchema = z.object({
  provider: z.enum(['exa', 'tavily']).default('exa'),
  api_key: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const Context7McpSchema = z.object({
  api_key: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const ContexthubMcpSchema = z.object({
  enabled: z.boolean().default(true),
});

export const GrepAppMcpSchema = z.object({
  enabled: z.boolean().default(true),
});

export const BacklogMdMcpSchema = z.object({
  enabled: z.boolean().default(true),
});

export const McpConfigSchema = z.object({
  websearch: WebsearchMcpSchema.optional(),
  context7: Context7McpSchema.optional(),
  contexthub: ContexthubMcpSchema.optional(),
  grep_app: GrepAppMcpSchema.optional(),
  backlog_md: BacklogMdMcpSchema.optional(),
});

export type WebsearchMcpConfig = z.infer<typeof WebsearchMcpSchema>;
export type Context7McpConfig = z.infer<typeof Context7McpSchema>;
export type ContexthubMcpConfig = z.infer<typeof ContexthubMcpSchema>;
export type GrepAppMcpConfig = z.infer<typeof GrepAppMcpSchema>;
export type BacklogMdMcpConfig = z.infer<typeof BacklogMdMcpSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;
