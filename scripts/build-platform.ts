import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

interface PlatformTarget {
  key: string;
  target: string;
  binary: string;
}

interface ResolvedTarget {
  key: string;
  target: string;
}

const SHORT_TO_TARGET: Record<string, string> = {
  'darwin-arm64': 'bun-darwin-arm64',
  'darwin-x64': 'bun-darwin-x64',
  'darwin-x64-baseline': 'bun-darwin-x64-baseline',
  'linux-arm64': 'bun-linux-arm64',
  'linux-x64': 'bun-linux-x64',
  'linux-x64-baseline': 'bun-linux-x64-baseline',
  'linux-arm64-musl': 'bun-linux-arm64-musl',
  'linux-x64-musl': 'bun-linux-x64-musl',
  'linux-x64-musl-baseline': 'bun-linux-x64-baseline-musl',
  'windows-x64': 'bun-windows-x64',
  'windows-x64-baseline': 'bun-windows-x64-baseline',
};

const PREFIX_TO_SHORT: Record<string, string> = {
  'gstack-darwin-arm64': 'darwin-arm64',
  'gstack-darwin-x64': 'darwin-x64',
  'gstack-darwin-x64-baseline': 'darwin-x64-baseline',
  'gstack-linux-arm64': 'linux-arm64',
  'gstack-linux-x64': 'linux-x64',
  'gstack-linux-x64-baseline': 'linux-x64-baseline',
  'gstack-linux-arm64-musl': 'linux-arm64-musl',
  'gstack-linux-x64-musl': 'linux-x64-musl',
  'gstack-linux-x64-musl-baseline': 'linux-x64-musl-baseline',
  'gstack-windows-x64': 'windows-x64',
  'gstack-windows-x64-baseline': 'windows-x64-baseline',
};

const PLATFORMS: PlatformTarget[] = [
  { key: 'darwin-arm64', target: 'bun-darwin-arm64', binary: 'gstack' },
  { key: 'darwin-x64', target: 'bun-darwin-x64', binary: 'gstack' },
  { key: 'darwin-x64-baseline', target: 'bun-darwin-x64-baseline', binary: 'gstack' },
  { key: 'linux-x64-baseline', target: 'bun-linux-x64-baseline', binary: 'gstack' },
  { key: 'linux-arm64', target: 'bun-linux-arm64', binary: 'gstack' },
  { key: 'linux-x64', target: 'bun-linux-x64', binary: 'gstack' },
  {
    key: 'linux-x64-musl-baseline',
    target: 'bun-linux-x64-baseline-musl',
    binary: 'gstack',
  },
  { key: 'linux-arm64-musl', target: 'bun-linux-arm64-musl', binary: 'gstack' },
  { key: 'linux-x64-musl', target: 'bun-linux-x64-musl', binary: 'gstack' },
  { key: 'windows-x64-baseline', target: 'bun-windows-x64-baseline', binary: 'gstack.exe' },
  { key: 'windows-x64', target: 'bun-windows-x64', binary: 'gstack.exe' },
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
  const normalized = PREFIX_TO_SHORT[value] ?? value;

  if (SHORT_TO_TARGET[normalized]) {
    return { key: normalized, target: SHORT_TO_TARGET[normalized] };
  }

  const byTarget = Object.entries(SHORT_TO_TARGET).find(([, target]) => target === value);
  if (byTarget) {
    return { key: byTarget[0], target: byTarget[1] };
  }

  return { key: normalized, target: value };
}

function isBaselineTarget(platform: PlatformTarget): boolean {
  return platform.key.endsWith('-baseline') || platform.target.endsWith('-baseline');
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

  const packageDir = platform.key;
  const outfile = path.join('packages', packageDir, 'bin', platform.binary);
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
    throw new Error(`build failed for ${platform.key} (exit ${result.exitCode}): ${errText}`);
  }

  if (!fs.existsSync(outfile)) {
    throw new Error(`binary not found after build: ${outfile}`);
  }

  writeSha256File(outfile);
  process.stderr.write(`[build-platform] ${platform.key} → ${outfile}\n`);
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
        return PLATFORMS.filter((p) => p.target === resolved.target || p.key === resolved.key);
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
      failures.push(platform.key);
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
