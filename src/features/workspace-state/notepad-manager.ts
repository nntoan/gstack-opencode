import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getNotepadsDir } from '../../shared/path-helpers.ts';

export interface NotepadManager {
  write(category: string, content: string): Promise<void>;
  read(category: string): Promise<string>;
  list(): Promise<string[]>;
}

function getCategoryFilePath(directory: string, planName: string, category: string): string {
  return join(getNotepadsDir(directory, planName), `${category}.md`);
}

export function createNotepadManager(directory: string, planName: string): NotepadManager {
  const planNotepadsDir = getNotepadsDir(directory, planName);

  return {
    async write(category: string, content: string): Promise<void> {
      await mkdir(planNotepadsDir, { recursive: true });
      const filePath = getCategoryFilePath(directory, planName, category);
      await writeFile(filePath, `${content}\n`, { encoding: 'utf-8', flag: 'a' });
    },

    async read(category: string): Promise<string> {
      const filePath = getCategoryFilePath(directory, planName, category);
      try {
        return await readFile(filePath, 'utf-8');
      } catch {
        return '';
      }
    },

    async list(): Promise<string[]> {
      await mkdir(planNotepadsDir, { recursive: true });
      return (await readdir(planNotepadsDir)).filter((name) => name.endsWith('.md'));
    },
  };
}
