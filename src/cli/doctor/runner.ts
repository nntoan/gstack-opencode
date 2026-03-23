import { doctorChecks } from './checks/index.ts';
import type { DoctorCategory, DoctorCheck, DoctorResult } from './types.ts';

interface DoctorRunResult {
  check: DoctorCheck;
  result: DoctorResult;
}

interface RunDoctorOptions {
  checks?: DoctorCheck[];
  stdout?: {
    write: (chunk: string) => unknown;
  };
  stderr?: {
    write: (chunk: string) => unknown;
  };
}

const categoryOrder: DoctorCategory[] = ['system', 'config', 'tools', 'mcp'];

function categoryTitle(category: DoctorCategory): string {
  return category.toUpperCase();
}

function symbolForStatus(status: DoctorResult['status']): string {
  if (status === 'pass') return '✓';
  if (status === 'warn') return '⚠';
  return '✗';
}

function groupByCategory(items: DoctorRunResult[]): Map<DoctorCategory, DoctorRunResult[]> {
  const groups = new Map<DoctorCategory, DoctorRunResult[]>();
  for (const category of categoryOrder) {
    groups.set(category, []);
  }

  for (const item of items) {
    const current: DoctorRunResult[] = groups.get(item.check.category) ?? [];
    current.push(item);
    groups.set(item.check.category, current);
  }

  return groups;
}

async function runSingleCheck(check: DoctorCheck): Promise<DoctorRunResult> {
  try {
    const result: DoctorResult = await check.run();
    return { check, result };
  } catch (error) {
    return {
      check,
      result: {
        status: 'fail',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function printGroupedResults(
  grouped: Map<DoctorCategory, DoctorRunResult[]>,
  stdout: {
    write: (chunk: string) => unknown;
  }
): void {
  for (const category of categoryOrder) {
    stdout.write(`${categoryTitle(category)}\n`);
    const checks: DoctorRunResult[] = grouped.get(category) ?? [];
    for (const item of checks) {
      stdout.write(`  ${symbolForStatus(item.result.status)} ${item.result.message}\n`);
      if (item.result.detail) {
        stdout.write(`    ${item.result.detail}\n`);
      }
    }
    stdout.write('\n');
  }
}

export async function runDoctor(options: RunDoctorOptions = {}): Promise<void> {
  const checks: DoctorCheck[] = options.checks ?? doctorChecks;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  const settled = await Promise.allSettled(checks.map((check) => runSingleCheck(check)));
  const results: DoctorRunResult[] = settled.map((entry, index) => {
    if (entry.status === 'fulfilled') {
      return entry.value;
    }

    return {
      check: checks[index] as DoctorCheck,
      result: {
        status: 'fail',
        message: entry.reason instanceof Error ? entry.reason.message : String(entry.reason),
      },
    };
  });

  const grouped: Map<DoctorCategory, DoctorRunResult[]> = groupByCategory(results);
  printGroupedResults(grouped, stdout);

  const hasFailures: boolean = results.some((entry) => entry.result.status === 'fail');
  if (hasFailures) {
    stderr.write('Doctor finished with failures\n');
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}
