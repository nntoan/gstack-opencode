import type { DoctorCheck, DoctorResult } from '../types.ts';

interface McpCheckEnv {
  which: (command: string) => string | null;
}

async function runBacklogCliCheckWithEnv(env: McpCheckEnv): Promise<DoctorResult> {
  const backlogPath: string | null = env.which('backlog');
  if (backlogPath) {
    return { status: 'pass', message: 'Backlog.md CLI available', detail: backlogPath };
  }

  return {
    status: 'warn',
    message: 'Backlog.md CLI not found (optional — graceful degradation)',
  };
}

async function runBacklogCliCheck(): Promise<DoctorResult> {
  return runBacklogCliCheckWithEnv({ which: (command: string) => Bun.which(command) });
}

export const mcpChecks: DoctorCheck[] = [
  {
    name: 'Backlog.md CLI available',
    category: 'mcp',
    run: runBacklogCliCheck,
  },
];

export { runBacklogCliCheckWithEnv };
