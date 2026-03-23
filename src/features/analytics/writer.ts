import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { log } from '../../shared/logger.ts';

export async function appendJsonl(filePath: string, event: Record<string, unknown>): Promise<void> {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    appendFileSync(filePath, JSON.stringify(event) + '\n', 'utf-8');
  } catch (error) {
    log('[ERROR] Failed to write analytics event', { filePath, error: String(error) });
  }
}

export function readJsonl<T>(filePath: string): T[] {
  if (!existsSync(filePath)) return [];
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}
