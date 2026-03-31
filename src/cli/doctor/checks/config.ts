import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { GstackConfigSchema } from '../../../config/schema/main.ts';
import type { DoctorCheck, DoctorResult } from '../types.ts';

function getProjectConfigPath(): string {
  return path.join(process.env.HOME ?? '~', '.config', 'opencode', 'gstack.jsonc');
}

async function runConfigParseCheck(): Promise<DoctorResult> {
  const configPath: string = getProjectConfigPath();
  if (!existsSync(configPath)) {
    return {
      status: 'warn',
      message: 'Config file not found (using defaults)',
      detail: `Expected file: ${configPath}`,
    };
  }

  const raw: string = readFileSync(configPath, 'utf-8');
  const parseErrors: Array<{ error: number; offset: number; length: number }> = [];
  const parsed: unknown = parseJsonc(raw, parseErrors);
  if (parseErrors.length > 0) {
    return {
      status: 'fail',
      message: 'Config file is not valid JSONC',
      detail: `Found ${parseErrors.length} JSONC parse error(s)`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      status: 'fail',
      message: 'Config root must be an object',
    };
  }

  return { status: 'pass', message: 'Config file is valid JSONC' };
}

async function runConfigSchemaCheck(): Promise<DoctorResult> {
  const configPath: string = getProjectConfigPath();
  if (!existsSync(configPath)) {
    return {
      status: 'warn',
      message: 'Config schema check skipped (file not found)',
    };
  }

  const raw: string = readFileSync(configPath, 'utf-8');
  const parseErrors: Array<{ error: number; offset: number; length: number }> = [];
  const parsed: unknown = parseJsonc(raw, parseErrors);
  if (parseErrors.length > 0 || !parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      status: 'fail',
      message: 'Config schema validation failed',
      detail: 'Fix JSONC parse errors first',
    };
  }

  const result = GstackConfigSchema.safeParse(parsed);
  if (result.success) {
    return { status: 'pass', message: 'Config passes schema validation' };
  }

  const firstIssue = result.error.issues[0];
  return {
    status: 'fail',
    message: 'Config schema validation failed',
    detail: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : undefined,
  };
}

export const configChecks: DoctorCheck[] = [
  {
    name: 'Config file is valid JSONC',
    category: 'config',
    run: runConfigParseCheck,
  },
  {
    name: 'Config passes schema validation',
    category: 'config',
    run: runConfigSchemaCheck,
  },
];
