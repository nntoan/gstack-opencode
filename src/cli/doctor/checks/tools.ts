import type { DoctorCheck, DoctorResult } from '../types.ts';

async function runGitCliCheck(): Promise<DoctorResult> {
  const gitPath: string | null = Bun.which('git');
  if (gitPath) {
    return { status: 'pass', message: 'git CLI available', detail: gitPath };
  }

  return {
    status: 'fail',
    message: 'git CLI not found',
    detail: 'Install git and ensure it is available in PATH',
  };
}

async function runPlaywrightCheck(): Promise<DoctorResult> {
  const playwrightPath: string | null = Bun.which('playwright');
  if (playwrightPath) {
    return { status: 'pass', message: 'Playwright installed', detail: playwrightPath };
  }

  return {
    status: 'warn',
    message: 'Playwright not installed',
    detail: 'Install Playwright CLI globally if browser automation is needed',
  };
}

export const toolChecks: DoctorCheck[] = [
  {
    name: 'git CLI available',
    category: 'tools',
    run: runGitCliCheck,
  },
  {
    name: 'Playwright installed',
    category: 'tools',
    run: runPlaywrightCheck,
  },
];
