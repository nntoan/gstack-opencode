export interface UpstreamHash {
  path: string;
  hash: string;
  lastSync: string;
}

export interface SkillChange {
  name: string;
  linesAdded: number;
  linesRemoved: number;
  summary: string;
}

export interface FileChange {
  path: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface SyncReport {
  changedSkills: SkillChange[];
  changedBrowse: FileChange[];
  newSkills: string[];
  removedSkills: string[];
}

export type HashStore = Record<string, UpstreamHash>;
