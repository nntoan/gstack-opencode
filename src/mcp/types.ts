import { z } from 'zod';

export const McpNameSchema = z.enum([
  'websearch',
  'context7',
  'contexthub',
  'grep_app',
  'backlog_md',
]);

export type McpName = z.infer<typeof McpNameSchema>;

export const AnyMcpNameSchema = z.string().min(1);

export type AnyMcpName = z.infer<typeof AnyMcpNameSchema>;

export type RemoteMcpConfig = {
  type: 'remote';
  url: string;
  enabled: boolean;
  headers?: Record<string, string>;
  oauth?: false;
};

export type StdioMcpConfig = {
  type: 'stdio';
  command: string;
  args?: string[];
  enabled: boolean;
  env?: Record<string, string>;
};

export type LocalMcpConfig = {
  type: 'local';
  command: string[];
  enabled: boolean;
  environment?: Record<string, string>;
  timeout?: number;
};
