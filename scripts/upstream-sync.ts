/**
 * upstream-sync.ts
 *
 * Shallow-clones the upstream gstack repo, hashes all SKILL.md.tmpl and
 * browse/src/*.ts files, compares against our stored hashes, and writes a
 * Markdown change report.  Never modifies source files — report-only tool.
 *
 * Exit codes:
 *   0 — no changes detected
 *   1 — changes detected (report written)
 *   2 — fatal error
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { SyncReport, HashStore, SkillChange, FileChange } from './upstream-sync-types.ts';
import { GSTACK_DIR, ORCHESTRATOR_DIR } from '../src/features/workspace-state/constants.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_REPO = 'https://github.com/garrytan/gstack.git';
const DEFAULT_BRANCH = 'main';
const CLONE_DIR = '/tmp/gstack-upstream-sync';
const HASH_FILENAME = 'upstream-hashes.json';

// ---------------------------------------------------------------------------
// Arg parsing
// ---------------------------------------------------------------------------

export interface SyncArgs {
  repo: string;
  branch: string;
  output: string;
}

export function parseArgs(argv: string[]): SyncArgs {
  const args: SyncArgs = {
    repo: DEFAULT_REPO,
    branch: DEFAULT_BRANCH,
    output: path.join(process.cwd(), GSTACK_DIR, 'sync-report.md'),
  };

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--repo' && value) {
      args.repo = value;
      i++;
    } else if (flag === '--branch' && value) {
      args.branch = value;
      i++;
    } else if (flag === '--output' && value) {
      args.output = value;
      i++;
    }
  }

  return args;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ---------------------------------------------------------------------------
// Line-diff (simple line-count approach, sufficient for change reporting)
// ---------------------------------------------------------------------------

export function computeLineDiff(
  oldContent: string,
  newContent: string
): { added: number; removed: number } {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Use a simple longest-common-subsequence length to approximate diff lines.
  // For a reporting-only tool this is accurate enough and avoids a heavy dep.
  const lcs = longestCommonSubsequenceLength(oldLines, newLines);
  const removed = oldLines.length - lcs;
  const added = newLines.length - lcs;
  return { added: Math.max(0, added), removed: Math.max(0, removed) };
}

/** O(m*n) LCS length — kept private, only used by computeLineDiff. */
function longestCommonSubsequenceLength(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  // Use two-row rolling array to keep memory linear in n.
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

export function findSkillTemplates(dir: string): string[] {
  const skillsDir = path.join(dir, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('gstack-'))
    .map((d) => path.join(skillsDir, d.name, 'SKILL.md.tmpl'))
    .filter((p) => fs.existsSync(p));
}

export function findBrowseFiles(dir: string): string[] {
  const browseDir = path.join(dir, 'browse', 'src');
  if (!fs.existsSync(browseDir)) return [];

  return fs
    .readdirSync(browseDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => path.join(browseDir, f));
}

// ---------------------------------------------------------------------------
// Hash store I/O
// ---------------------------------------------------------------------------

function hashFilePath(): string {
  return path.join(process.cwd(), GSTACK_DIR, ORCHESTRATOR_DIR, HASH_FILENAME);
}

export function loadHashStore(filePath?: string): HashStore {
  const fp = filePath ?? hashFilePath();
  if (!fs.existsSync(fp)) return {};
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8')) as HashStore;
  } catch {
    return {};
  }
}

export function saveHashStore(store: HashStore, filePath?: string): void {
  const fp = filePath ?? hashFilePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(store, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

export function buildReport(report: SyncReport, timestamp: string): string {
  const lines: string[] = [];

  lines.push('# Upstream Sync Report');
  lines.push('');
  lines.push(`**Generated**: ${timestamp}`);
  lines.push('');

  if (
    report.changedSkills.length === 0 &&
    report.changedBrowse.length === 0 &&
    report.newSkills.length === 0 &&
    report.removedSkills.length === 0
  ) {
    lines.push('No changes detected.');
    return lines.join('\n');
  }

  if (report.changedSkills.length > 0) {
    lines.push('## Changed Skills');
    lines.push('');
    for (const s of report.changedSkills) {
      lines.push(`### ${s.name}`);
      lines.push('');
      lines.push(`- Lines added: **+${s.linesAdded}**`);
      lines.push(`- Lines removed: **-${s.linesRemoved}**`);
      if (s.summary) {
        lines.push(`- Summary: ${s.summary}`);
      }
      lines.push('');
    }
  }

  if (report.newSkills.length > 0) {
    lines.push('## New Skills (upstream only)');
    lines.push('');
    for (const name of report.newSkills) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  if (report.removedSkills.length > 0) {
    lines.push('## Removed Skills (no longer upstream)');
    lines.push('');
    for (const name of report.removedSkills) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  if (report.changedBrowse.length > 0) {
    lines.push('## Changed Browse Files');
    lines.push('');
    for (const f of report.changedBrowse) {
      lines.push(`### \`${f.path}\``);
      lines.push('');
      lines.push(`- Lines added: **+${f.linesAdded}**`);
      lines.push(`- Lines removed: **-${f.linesRemoved}**`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Git clone
// ---------------------------------------------------------------------------

export function cloneUpstream(repo: string, branch: string, destDir: string): void {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  const result = Bun.spawnSync(
    ['git', 'clone', '--depth', '1', '--single-branch', '--branch', branch, repo, destDir],
    { stderr: 'pipe', stdout: 'pipe' }
  );

  if (result.exitCode !== 0) {
    const errText = result.stderr ? new TextDecoder().decode(result.stderr) : 'unknown git error';
    throw new Error(`git clone failed (exit ${result.exitCode}): ${errText}`);
  }
}

// ---------------------------------------------------------------------------
// Skill name extraction
// ---------------------------------------------------------------------------

function skillNameFromPath(tmplPath: string): string {
  // …/.agents/skills/gstack-<name>/SKILL.md.tmpl → gstack-<name>
  return path.basename(path.dirname(tmplPath));
}

function browseRelativePath(filePath: string, cloneDir: string): string {
  return path.relative(cloneDir, filePath);
}

// ---------------------------------------------------------------------------
// Core comparison logic
// ---------------------------------------------------------------------------

export interface CompareResult {
  report: SyncReport;
  updatedStore: HashStore;
}

export function compareWithStore(
  cloneDir: string,
  existingStore: HashStore,
  now: string
): CompareResult {
  const changedSkills: SkillChange[] = [];
  const changedBrowse: FileChange[] = [];
  const newSkills: string[] = [];

  const seenSkillKeys = new Set<string>();
  const seenBrowseKeys = new Set<string>();

  const updatedStore: HashStore = { ...existingStore };

  const skillFiles = findSkillTemplates(cloneDir);
  for (const tmplPath of skillFiles) {
    const skillName = skillNameFromPath(tmplPath);
    const relKey = path.relative(cloneDir, tmplPath);
    seenSkillKeys.add(relKey);

    const content = fs.readFileSync(tmplPath, 'utf-8');
    const newHash = computeHash(content);

    const existing = existingStore[relKey];
    if (!existing) {
      newSkills.push(skillName);
      updatedStore[relKey] = { path: relKey, hash: newHash, lastSync: now };
    } else if (existing.hash !== newHash) {
      changedSkills.push({
        name: skillName,
        linesAdded: 0,
        linesRemoved: 0,
        summary: 'Content changed (hash mismatch). Manual review required.',
      });
      updatedStore[relKey] = { path: relKey, hash: newHash, lastSync: now };
    }
  }

  const browseFiles = findBrowseFiles(cloneDir);
  for (const filePath of browseFiles) {
    const relKey = browseRelativePath(filePath, cloneDir);
    seenBrowseKeys.add(relKey);

    const content = fs.readFileSync(filePath, 'utf-8');
    const newHash = computeHash(content);

    const existing = existingStore[relKey];
    if (!existing) {
      updatedStore[relKey] = { path: relKey, hash: newHash, lastSync: now };
    } else if (existing.hash !== newHash) {
      changedBrowse.push({
        path: relKey,
        linesAdded: 0,
        linesRemoved: 0,
      });
      updatedStore[relKey] = { path: relKey, hash: newHash, lastSync: now };
    }
  }

  const removedSkills: string[] = [];
  for (const key of Object.keys(existingStore)) {
    if (key.includes('.agents/skills/gstack-') && !seenSkillKeys.has(key)) {
      removedSkills.push(skillNameFromPath(key));
      delete updatedStore[key];
    }
  }

  return {
    report: { changedSkills, changedBrowse, newSkills, removedSkills },
    updatedStore,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  const now = new Date().toISOString();

  process.stderr.write(`[upstream-sync] repo: ${args.repo}\n`);
  process.stderr.write(`[upstream-sync] branch: ${args.branch}\n`);
  process.stderr.write(`[upstream-sync] output: ${args.output}\n`);

  try {
    process.stderr.write(`[upstream-sync] cloning to ${CLONE_DIR}...\n`);
    cloneUpstream(args.repo, args.branch, CLONE_DIR);

    const existingStore = loadHashStore();
    const { report, updatedStore } = compareWithStore(CLONE_DIR, existingStore, now);
    saveHashStore(updatedStore);

    const hasChanges =
      report.changedSkills.length > 0 ||
      report.changedBrowse.length > 0 ||
      report.newSkills.length > 0 ||
      report.removedSkills.length > 0;

    const markdown = buildReport(report, now);
    fs.mkdirSync(path.dirname(args.output), { recursive: true });
    fs.writeFileSync(args.output, markdown, 'utf-8');
    process.stderr.write(`[upstream-sync] report written to ${args.output}\n`);

    fs.rmSync(CLONE_DIR, { recursive: true, force: true });
    process.stderr.write(`[upstream-sync] cleaned up ${CLONE_DIR}\n`);

    return hasChanges ? 1 : 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[upstream-sync] ERROR: ${msg}\n`);
    try {
      fs.rmSync(CLONE_DIR, { recursive: true, force: true });
    } catch (_) {
      void _;
    }
    return 2;
  }
}

if (import.meta.main) {
  const exitCode = await main();
  process.exit(exitCode);
}
