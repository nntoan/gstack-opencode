import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getSessionsDir } from '../../shared/path-helpers.ts';
import type { SessionRecord } from './types.ts';

const DEFAULT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface SessionTracker {
  start(sessionId: string, phase: SessionRecord['phase'], agent: string): Promise<SessionRecord>;
  complete(sessionId: string): Promise<SessionRecord | null>;
  getActive(): Promise<SessionRecord[]>;
  cleanup(maxAgeMs?: number): Promise<number>;
}

function getSessionFilePath(directory: string, sessionId: string): string {
  return join(getSessionsDir(directory), `${sessionId}.json`);
}

async function readSessionFile(filePath: string): Promise<SessionRecord | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const candidate = parsed as SessionRecord;
    if (!candidate.sessionId || !candidate.phase || !candidate.agent || !candidate.status) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

export function createSessionTracker(directory: string): SessionTracker {
  const sessionsDir = getSessionsDir(directory);

  return {
    async start(
      sessionId: string,
      phase: SessionRecord['phase'],
      agent: string
    ): Promise<SessionRecord> {
      await mkdir(sessionsDir, { recursive: true });
      const record: SessionRecord = {
        sessionId,
        startedAt: new Date().toISOString(),
        phase,
        agent,
        status: 'active',
      };

      await writeFile(
        getSessionFilePath(directory, sessionId),
        JSON.stringify(record, null, 2),
        'utf-8'
      );
      return record;
    },

    async complete(sessionId: string): Promise<SessionRecord | null> {
      const filePath = getSessionFilePath(directory, sessionId);
      const existing = await readSessionFile(filePath);
      if (!existing) {
        return null;
      }

      const updated: SessionRecord = {
        ...existing,
        status: 'completed',
      };

      await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      return updated;
    },

    async getActive(): Promise<SessionRecord[]> {
      await mkdir(sessionsDir, { recursive: true });
      const files = (await readdir(sessionsDir)).filter((fileName) => fileName.endsWith('.json'));
      const records = await Promise.all(
        files.map((fileName) => readSessionFile(join(sessionsDir, fileName)))
      );

      return records.filter((record): record is SessionRecord => record?.status === 'active');
    },

    async cleanup(maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<number> {
      await mkdir(sessionsDir, { recursive: true });
      const now = Date.now();
      const files = (await readdir(sessionsDir)).filter((fileName) => fileName.endsWith('.json'));

      let removed = 0;
      for (const fileName of files) {
        const filePath = join(sessionsDir, fileName);
        const fileStat = await stat(filePath);
        if (now - fileStat.mtimeMs > maxAgeMs) {
          await unlink(filePath);
          removed += 1;
        }
      }

      return removed;
    },
  };
}
