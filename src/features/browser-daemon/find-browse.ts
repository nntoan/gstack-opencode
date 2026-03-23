/**
 * find-browse — locate the @nntoan/gstack browse binary.
 *
 * Compiled to browse/dist/find-browse (standalone binary, no bun runtime needed).
 * Outputs the absolute path to the browse binary on stdout, or exits 1 if not found.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ─── Binary Discovery ───────────────────────────────────────────

function getGitRoot(): string | null {
  try {
    const proc = Bun.spawnSync(['git', 'rev-parse', '--show-toplevel'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    if (proc.exitCode !== 0) return null;
    return proc.stdout.toString().trim();
  } catch {
    return null;
  }
}

export function locateBinary(): string | null {
  const root = getGitRoot();
  const home = homedir();
  const markers = ['.codex', '.agents', '.claude'];

  // Workspace-local takes priority (for development)
  if (root) {
    for (const m of markers) {
      const local = join(root, m, 'skills', 'gstack', 'browse', 'dist', 'browse');
      if (existsSync(local)) return local;
    }

    // npm install path: node_modules/@nntoan/gstack/dist/browse
    const npmLocal = join(root, 'node_modules', '@nntoan', 'gstack', 'dist', 'browse');
    if (existsSync(npmLocal)) return npmLocal;
  }

  // Global fallback
  for (const m of markers) {
    const global = join(home, m, 'skills', 'gstack', 'browse', 'dist', 'browse');
    if (existsSync(global)) return global;
  }

  // Global npm fallback
  const npmGlobal = join(
    home,
    '.npm-global',
    'lib',
    'node_modules',
    '@nntoan',
    'gstack',
    'dist',
    'browse'
  );
  if (existsSync(npmGlobal)) return npmGlobal;

  return null;
}

// ─── Main ───────────────────────────────────────────────────────

function main(): void {
  const bin = locateBinary();
  if (!bin) {
    process.stderr.write('ERROR: browse binary not found. Run: cd <skill-dir> && ./setup\n');
    process.exit(1);
  }

  process.stdout.write(bin + '\n');
}

main();
