import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  computeHash,
  computeLineDiff,
  buildReport,
  parseArgs,
  findSkillTemplates,
  findBrowseFiles,
  loadHashStore,
  saveHashStore,
  compareWithStore,
} from './upstream-sync.ts';
import type { SyncReport, HashStore } from './upstream-sync-types.ts';

describe('computeHash', () => {
  it('returns a 64-char hex string for non-empty input', () => {
    const hash = computeHash('hello world');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('returns consistent results for the same input', () => {
    expect(computeHash('abc')).toBe(computeHash('abc'));
  });

  it('returns different hashes for different inputs', () => {
    expect(computeHash('abc')).not.toBe(computeHash('xyz'));
  });

  it('handles empty string', () => {
    const hash = computeHash('');
    expect(hash).toHaveLength(64);
  });
});

describe('computeLineDiff', () => {
  it('reports zero for identical content', () => {
    const { added, removed } = computeLineDiff('a\nb\nc', 'a\nb\nc');
    expect(added).toBe(0);
    expect(removed).toBe(0);
  });

  it('counts added lines when new content is longer', () => {
    const { added, removed } = computeLineDiff('a\nb', 'a\nb\nc\nd');
    expect(added).toBe(2);
    expect(removed).toBe(0);
  });

  it('counts removed lines when new content is shorter', () => {
    const { added, removed } = computeLineDiff('a\nb\nc', 'a');
    expect(removed).toBe(2);
    expect(added).toBe(0);
  });

  it('handles completely different content', () => {
    const { added, removed } = computeLineDiff('x\ny\nz', 'a\nb\nc');
    expect(added).toBe(3);
    expect(removed).toBe(3);
  });
});

describe('parseArgs', () => {
  it('returns defaults when no args provided', () => {
    const args = parseArgs([]);
    expect(args.repo).toBe('https://github.com/garrytan/gstack.git');
    expect(args.branch).toBe('main');
    expect(args.output).toContain('sync-report.md');
  });

  it('overrides repo from --repo flag', () => {
    const args = parseArgs(['--repo', 'https://example.com/repo.git']);
    expect(args.repo).toBe('https://example.com/repo.git');
  });

  it('overrides branch from --branch flag', () => {
    const args = parseArgs(['--branch', 'develop']);
    expect(args.branch).toBe('develop');
  });

  it('overrides output from --output flag', () => {
    const args = parseArgs(['--output', '/tmp/report.md']);
    expect(args.output).toBe('/tmp/report.md');
  });

  it('handles multiple flags together', () => {
    const args = parseArgs(['--repo', 'r', '--branch', 'b', '--output', 'o']);
    expect(args.repo).toBe('r');
    expect(args.branch).toBe('b');
    expect(args.output).toBe('o');
  });
});

describe('buildReport', () => {
  const ts = '2026-01-01T00:00:00.000Z';

  it('produces no-changes message when report is empty', () => {
    const report: SyncReport = {
      changedSkills: [],
      changedBrowse: [],
      newSkills: [],
      removedSkills: [],
    };
    const md = buildReport(report, ts);
    expect(md).toContain('No changes detected.');
    expect(md).not.toContain('## Changed Skills');
  });

  it('includes changed skills section', () => {
    const report: SyncReport = {
      changedSkills: [{ name: 'gstack-pm', linesAdded: 5, linesRemoved: 2, summary: 'Updated' }],
      changedBrowse: [],
      newSkills: [],
      removedSkills: [],
    };
    const md = buildReport(report, ts);
    expect(md).toContain('## Changed Skills');
    expect(md).toContain('### gstack-pm');
    expect(md).toContain('+5');
    expect(md).toContain('-2');
    expect(md).toContain('Updated');
  });

  it('includes new skills section', () => {
    const report: SyncReport = {
      changedSkills: [],
      changedBrowse: [],
      newSkills: ['gstack-newfeature'],
      removedSkills: [],
    };
    const md = buildReport(report, ts);
    expect(md).toContain('## New Skills');
    expect(md).toContain('gstack-newfeature');
  });

  it('includes removed skills section', () => {
    const report: SyncReport = {
      changedSkills: [],
      changedBrowse: [],
      newSkills: [],
      removedSkills: ['gstack-old'],
    };
    const md = buildReport(report, ts);
    expect(md).toContain('## Removed Skills');
    expect(md).toContain('gstack-old');
  });

  it('includes changed browse files section', () => {
    const report: SyncReport = {
      changedSkills: [],
      changedBrowse: [{ path: 'browse/src/snapshot.ts', linesAdded: 10, linesRemoved: 3 }],
      newSkills: [],
      removedSkills: [],
    };
    const md = buildReport(report, ts);
    expect(md).toContain('## Changed Browse Files');
    expect(md).toContain('snapshot.ts');
    expect(md).toContain('+10');
    expect(md).toContain('-3');
  });

  it('always includes generated timestamp', () => {
    const report: SyncReport = {
      changedSkills: [],
      changedBrowse: [],
      newSkills: [],
      removedSkills: [],
    };
    const md = buildReport(report, ts);
    expect(md).toContain(ts);
  });
});

describe('findSkillTemplates', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when skills dir does not exist', () => {
    expect(findSkillTemplates(tmpDir)).toEqual([]);
  });

  it('finds SKILL.md.tmpl files in gstack-* subdirectories', () => {
    const skillDir = path.join(tmpDir, '.agents', 'skills', 'gstack-pm');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md.tmpl'), 'template content');

    const results = findSkillTemplates(tmpDir);
    expect(results).toHaveLength(1);
    expect(results[0]).toContain('gstack-pm');
    expect(results[0]).toContain('SKILL.md.tmpl');
  });

  it('ignores directories not starting with gstack-', () => {
    const skillDir = path.join(tmpDir, '.agents', 'skills', 'other-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md.tmpl'), 'template');

    expect(findSkillTemplates(tmpDir)).toHaveLength(0);
  });

  it('ignores gstack-* directories without SKILL.md.tmpl', () => {
    const skillDir = path.join(tmpDir, '.agents', 'skills', 'gstack-empty');
    fs.mkdirSync(skillDir, { recursive: true });

    expect(findSkillTemplates(tmpDir)).toHaveLength(0);
  });
});

describe('findBrowseFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-browse-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array when browse/src does not exist', () => {
    expect(findBrowseFiles(tmpDir)).toEqual([]);
  });

  it('finds .ts files in browse/src', () => {
    const browseDir = path.join(tmpDir, 'browse', 'src');
    fs.mkdirSync(browseDir, { recursive: true });
    fs.writeFileSync(path.join(browseDir, 'server.ts'), 'content');
    fs.writeFileSync(path.join(browseDir, 'client.ts'), 'content');

    expect(findBrowseFiles(tmpDir)).toHaveLength(2);
  });

  it('ignores non-.ts files', () => {
    const browseDir = path.join(tmpDir, 'browse', 'src');
    fs.mkdirSync(browseDir, { recursive: true });
    fs.writeFileSync(path.join(browseDir, 'README.md'), 'docs');

    expect(findBrowseFiles(tmpDir)).toHaveLength(0);
  });
});

describe('loadHashStore / saveHashStore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-hash-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty object when file does not exist', () => {
    const store = loadHashStore(path.join(tmpDir, 'nonexistent.json'));
    expect(store).toEqual({});
  });

  it('returns empty object when file is invalid JSON', () => {
    const fp = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(fp, 'not json', 'utf-8');
    expect(loadHashStore(fp)).toEqual({});
  });

  it('round-trips store through save/load', () => {
    const fp = path.join(tmpDir, 'hashes.json');
    const store: HashStore = {
      'key/one': { path: 'key/one', hash: 'abc123', lastSync: '2026-01-01T00:00:00.000Z' },
    };
    saveHashStore(store, fp);
    const loaded = loadHashStore(fp);
    expect(loaded).toEqual(store);
  });

  it('creates parent directories when saving', () => {
    const fp = path.join(tmpDir, 'nested', 'deep', 'hashes.json');
    saveHashStore({}, fp);
    expect(fs.existsSync(fp)).toBe(true);
  });
});

describe('compareWithStore', () => {
  let tmpDir: string;
  const now = '2026-01-01T00:00:00.000Z';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gstack-compare-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function makeSkill(name: string, content: string): string {
    const dir = path.join(tmpDir, '.agents', 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    const tmpl = path.join(dir, 'SKILL.md.tmpl');
    fs.writeFileSync(tmpl, content);
    return tmpl;
  }

  it('reports new skill when store is empty', () => {
    makeSkill('gstack-pm', 'template');
    const { report } = compareWithStore(tmpDir, {}, now);
    expect(report.newSkills).toContain('gstack-pm');
    expect(report.changedSkills).toHaveLength(0);
    expect(report.removedSkills).toHaveLength(0);
  });

  it('reports no changes when hashes match', () => {
    makeSkill('gstack-pm', 'template');
    const relKey = `.agents/skills/gstack-pm/SKILL.md.tmpl`;
    const store: HashStore = {
      [relKey]: { path: relKey, hash: computeHash('template'), lastSync: now },
    };
    const { report } = compareWithStore(tmpDir, store, now);
    expect(report.changedSkills).toHaveLength(0);
    expect(report.newSkills).toHaveLength(0);
    expect(report.removedSkills).toHaveLength(0);
  });

  it('reports changed skill when hash differs', () => {
    makeSkill('gstack-pm', 'updated template');
    const relKey = `.agents/skills/gstack-pm/SKILL.md.tmpl`;
    const store: HashStore = {
      [relKey]: { path: relKey, hash: computeHash('old template'), lastSync: now },
    };
    const { report } = compareWithStore(tmpDir, store, now);
    expect(report.changedSkills).toHaveLength(1);
    expect(report.changedSkills[0].name).toBe('gstack-pm');
  });

  it('reports removed skill when key in store but not upstream', () => {
    const store: HashStore = {
      '.agents/skills/gstack-deleted/SKILL.md.tmpl': {
        path: '.agents/skills/gstack-deleted/SKILL.md.tmpl',
        hash: 'oldhash',
        lastSync: now,
      },
    };
    const { report } = compareWithStore(tmpDir, store, now);
    expect(report.removedSkills).toContain('gstack-deleted');
  });

  it('updates store with new hashes after comparison', () => {
    makeSkill('gstack-pm', 'template');
    const { updatedStore } = compareWithStore(tmpDir, {}, now);
    const key = `.agents/skills/gstack-pm/SKILL.md.tmpl`;
    expect(updatedStore[key]).toBeDefined();
    expect(updatedStore[key].hash).toBe(computeHash('template'));
    expect(updatedStore[key].lastSync).toBe(now);
  });
});
