import { existsSync } from 'fs';
import * as path from 'path';
import type { DoctorCheck, DoctorResult } from '../types.ts';

function parseMajor(version: string): number {
  const [major] = version.split('.');
  const parsed: number = Number.parseInt(major ?? '0', 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function runBunVersionCheck(): Promise<DoctorResult> {
  const major: number = parseMajor(Bun.version);
  if (major >= 1) {
    return { status: 'pass', message: `Bun version >= 1.0 (${Bun.version})` };
  }

  return {
    status: 'fail',
    message: `Bun version is too old (${Bun.version})`,
    detail: 'Please upgrade Bun to 1.0 or newer',
  };
}

async function runPluginBinaryCheck(): Promise<DoctorResult> {
  const inPath: boolean = typeof Bun.which('gstack') === 'string';
  const localBinPath: string = path.join(process.cwd(), 'bin', 'gstack.js');
  const localBinExists: boolean = existsSync(localBinPath);

  if (inPath || localBinExists) {
    return {
      status: 'pass',
      message: inPath ? 'Plugin binary found in PATH' : `Plugin binary found at ${localBinPath}`,
    };
  }

  return {
    status: 'fail',
    message: 'Plugin binary not found',
    detail: 'Install @nntoan/gstack globally or run from repository root with bin/gstack.js',
  };
}

export const systemChecks: DoctorCheck[] = [
  {
    name: 'Bun version >= 1.0',
    category: 'system',
    run: runBunVersionCheck,
  },
  {
    name: 'Plugin binary found',
    category: 'system',
    run: runPluginBinaryCheck,
  },
];
