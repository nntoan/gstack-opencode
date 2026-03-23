import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getReviewsDir } from '../../shared/path-helpers.ts';
import type { ReviewDashboardEntry } from './types.ts';

export interface ShipReadiness {
  ready: boolean;
  missing: string[];
}

export interface ReviewDashboard {
  record(entry: ReviewDashboardEntry): Promise<ReviewDashboardEntry[]>;
  getStatus(): Promise<ReviewDashboardEntry[]>;
  isShipReady(): Promise<ShipReadiness>;
}

function getDashboardFilePath(directory: string): string {
  return join(getReviewsDir(directory), 'dashboard.json');
}

async function readDashboardFile(filePath: string): Promise<ReviewDashboardEntry[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is ReviewDashboardEntry =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    );
  } catch {
    return [];
  }
}

export function createReviewDashboard(directory: string): ReviewDashboard {
  const reviewsDir = getReviewsDir(directory);
  const filePath = getDashboardFilePath(directory);

  return {
    async record(entry: ReviewDashboardEntry): Promise<ReviewDashboardEntry[]> {
      await mkdir(reviewsDir, { recursive: true });
      const existing = await readDashboardFile(filePath);
      const updated = [...existing, entry];
      await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      return updated;
    },

    async getStatus(): Promise<ReviewDashboardEntry[]> {
      return readDashboardFile(filePath);
    },

    async isShipReady(): Promise<ShipReadiness> {
      const entries = await readDashboardFile(filePath);
      const engPassed = entries.some(
        (entry) => entry.reviewType === 'eng' && entry.status === 'passed'
      );

      if (engPassed) {
        return { ready: true, missing: [] };
      }

      return {
        ready: false,
        missing: ['eng:passed'],
      };
    },
  };
}
