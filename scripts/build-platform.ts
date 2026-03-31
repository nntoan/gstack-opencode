import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

interface PlatformTarget {
  dir: string;
  target: string;
  binary: string;
}

interface ResolvedTarget {
  dir: string;
  target: string;
}

const PLATFORMS: PlatformTarget[] = [
  { dir: 'gstack-darwin-arm64', target: 'bun-darwin-arm64', binary: 'gstack' },
  { dir: 'gstack-darwin-x64', target: 'bun-darwin-x64', binary: 'gstack' },
  { dir: 'gstack-darwin-x64-baseline', target: 'bun-darwin-x64-baseline', binary: 'gstack' },
  { dir: 'gstack-linux-x64-baseline', target: 'bun-linux-x64-baseline', binary: 'gstack' },
  { dir: 'gstack-linux-arm64', target: 'bun-linux-arm64', binary: 'gstack' },
  { dir: 'gstack-linux-x64', target: 'bun-linux-x64', binary: 'gstack' },
  {
    dir: 'gstack-linux-x64-musl-baseline',
    target: 'bun-linux-x64-baseline-musl',
    binary: 'gstack',
  },
  { dir: 'gstack-linux-arm64-musl', target: 'bun-linux-arm64-musl', binary: 'gstack' },
  { dir: 'gstack-linux-x64-musl', target: 'bun-linux-x64-musl', binary: 'gstack' },
  { dir: 'gstack-windows-x64-baseline', target: 'bun-windows-x64-baseline', binary: 'gstack.exe' },
  { dir: 'gstack-windows-x64', target: 'bun-windows-x64', binary: 'gstack.exe' },
];

const ENTRY_POINT = 'src/cli/index.ts';

function parseTarget(argv: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--target' && argv[i + 1]) return argv[i + 1];
    if (argv[i].startsWith('--target=')) return argv[i].slice('--target='.length);
  }
  return undefined;
}

function resolveTargetAlias(value: string): ResolvedTarget {
  if (value === 'gstack-win32-x64') {
    return { dir: 'gstack-windows-x64', target: 'bun-windows-x64' };
  }

  if (value === 'gstack-win32-x64-baseline') {
    return { dir: 'gstack-windows-x64-baseline', target: 'bun-windows-x64-baseline' };
  }

  if (value === 'bun-win32-x64') {
    return { dir: 'gstack-windows-x64', target: 'bun-windows-x64' };
  }

  if (value === 'bun-win32-x64-baseline') {
    return { dir: 'gstack-windows-x64-baseline', target: 'bun-windows-x64-baseline' };
  }

  return { dir: value, target: value };
}

function isBaselineTarget(platform: PlatformTarget): boolean {
  return platform.dir.endsWith('-baseline') || platform.target.endsWith('-baseline');
}

function resolveBunCachePath(platform: PlatformTarget): string | null {
  const versionResult = Bun.spawnSync(['bun', '--version'], { stdout: 'pipe', stderr: 'pipe' });
  if (versionResult.exitCode !== 0) return null;
  const bunVersion = new TextDecoder().decode(versionResult.stdout).trim();
  if (!bunVersion) return null;

  const cacheResult = Bun.spawnSync(['bun', 'pm', 'cache'], { stdout: 'pipe', stderr: 'pipe' });
  if (cacheResult.exitCode !== 0) return null;
  const cacheDir = new TextDecoder().decode(cacheResult.stdout).trim();
  if (!cacheDir) return null;

  return path.join(cacheDir, `${platform.target}-v${bunVersion}`);
}

function clearStaleBaselineCache(platform: PlatformTarget): void {
  if (!isBaselineTarget(platform)) return;

  const cachePath = resolveBunCachePath(platform);
  if (!cachePath) return;

  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { force: true });
    process.stderr.write(`[build-platform] cleared stale cache: ${cachePath}\n`);
  }
}

function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function writeSha256File(binaryPath: string): void {
  const hash = computeFileHash(binaryPath);
  fs.writeFileSync(binaryPath + '.sha256', hash + '\n', 'utf-8');
}

async function buildTarget(platform: PlatformTarget): Promise<void> {
  clearStaleBaselineCache(platform);

  const outfile = path.join('packages', platform.dir, 'bin', platform.binary);
  fs.mkdirSync(path.dirname(outfile), { recursive: true });

  const result = Bun.spawnSync(
    [
      'bun',
      'build',
      '--compile',
      '--minify',
      `--target=${platform.target}`,
      ENTRY_POINT,
      `--outfile=${outfile}`,
    ],
    { stderr: 'pipe', stdout: 'pipe' }
  );

  if (result.exitCode !== 0) {
    const errText = result.stderr ? new TextDecoder().decode(result.stderr) : 'unknown error';
    throw new Error(`build failed for ${platform.dir} (exit ${result.exitCode}): ${errText}`);
  }

  if (!fs.existsSync(outfile)) {
    throw new Error(`binary not found after build: ${outfile}`);
  }

  writeSha256File(outfile);
  process.stderr.write(`[build-platform] ${platform.dir} → ${outfile}\n`);
}

async function main(argv: string[]): Promise<void> {
  const targetArg = parseTarget(argv);

  if (!fs.existsSync(ENTRY_POINT)) {
    process.stderr.write(`[build-platform] entry point not found: ${ENTRY_POINT}\n`);
    process.exit(1);
  }

  const targets = targetArg
    ? (() => {
        const resolved = resolveTargetAlias(targetArg);
        return PLATFORMS.filter((p) => p.target === resolved.target || p.dir === resolved.dir);
      })()
    : PLATFORMS;

  if (targets.length === 0) {
    process.stderr.write(`[build-platform] no platforms matched target: ${targetArg}\n`);
    process.exit(1);
  }

  const failures: string[] = [];

  for (const platform of targets) {
    try {
      await buildTarget(platform);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[build-platform] ERROR: ${msg}\n`);
      failures.push(platform.dir);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(
      `[build-platform] ${failures.length} platform(s) failed: ${failures.join(', ')}\n`
    );
    process.exit(1);
  }

  process.stderr.write(`[build-platform] all ${targets.length} platform(s) built successfully\n`);
}

if (import.meta.main) {
  await main(process.argv.slice(2));
}
