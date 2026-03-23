import { describe, expect, it } from 'vitest';
import { runDoctor } from './runner.ts';
import { runBacklogCliCheckWithEnv } from './checks/mcp.ts';
import type { DoctorCheck } from './types.ts';

interface MemoryWriter {
  chunks: string[];
  write: (chunk: string) => boolean;
}

function createWriter(): MemoryWriter {
  const chunks: string[] = [];
  return {
    chunks,
    write(chunk: string): boolean {
      chunks.push(chunk);
      return true;
    },
  };
}

function captureExitCode(): () => void {
  const previousExitCode: number | undefined = process.exitCode;
  return (): void => {
    process.exitCode = previousExitCode;
  };
}

describe('runDoctor', () => {
  it('runs and returns without crashing', async () => {
    const restoreExitCode: () => void = captureExitCode();
    try {
      const stdout = createWriter();
      const stderr = createWriter();

      const checks: DoctorCheck[] = [
        { name: 's1', category: 'system', run: async () => ({ status: 'pass', message: 'ok s1' }) },
        { name: 'c1', category: 'config', run: async () => ({ status: 'pass', message: 'ok c1' }) },
        {
          name: 't1',
          category: 'tools',
          run: async () => ({ status: 'warn', message: 'warn t1' }),
        },
        { name: 'm1', category: 'mcp', run: async () => ({ status: 'pass', message: 'ok m1' }) },
      ];

      await runDoctor({ checks, stdout, stderr });

      const output: string = stdout.chunks.join('');
      expect(output).toContain('SYSTEM');
      expect(output).toContain('CONFIG');
      expect(output).toContain('TOOLS');
      expect(output).toContain('MCP');
      expect(stderr.chunks.join('')).toBe('');
    } finally {
      restoreExitCode();
    }
  });

  it('groups results by category and prints symbols', async () => {
    const restoreExitCode: () => void = captureExitCode();
    try {
      const stdout = createWriter();
      const stderr = createWriter();

      const checks: DoctorCheck[] = [
        {
          name: 'sys',
          category: 'system',
          run: async () => ({ status: 'pass', message: 'Bun ok' }),
        },
        {
          name: 'cfg',
          category: 'config',
          run: async () => ({ status: 'warn', message: 'Config warn' }),
        },
        {
          name: 'tool',
          category: 'tools',
          run: async () => ({ status: 'fail', message: 'git missing' }),
        },
        {
          name: 'mcp',
          category: 'mcp',
          run: async () => ({ status: 'warn', message: 'Backlog optional' }),
        },
      ];

      await runDoctor({ checks, stdout, stderr });

      const output: string = stdout.chunks.join('');
      expect(output).toContain('✓ Bun ok');
      expect(output).toContain('⚠ Config warn');
      expect(output).toContain('✗ git missing');
      expect(output).toContain('⚠ Backlog optional');
      expect(stderr.chunks.join('')).toContain('Doctor finished with failures');
    } finally {
      restoreExitCode();
    }
  });
});

describe('mcp backlog check', () => {
  it('returns warn when backlog cli is missing', async () => {
    const result = await runBacklogCliCheckWithEnv({
      which: () => null,
    });

    expect(result.status).toBe('warn');
    expect(result.message).toContain('Backlog.md CLI not found');
  });
});
