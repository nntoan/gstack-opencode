import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runMemoirRefreshWithOptions } from './memoir.ts';

interface MemoryWriter {
  chunks: string[];
  write: (chunk: string) => boolean;
}

interface FakeExecState {
  graph: {
    concepts: Array<{ name: string; definition: string; labels: string[] }>;
    links: Array<{ source: string; relation: string; target: string }>;
  };
  memoirs: Set<string>;
}

function createWriter(): MemoryWriter {
  const chunks: string[] = [];
  return {
    chunks,
    write(chunk: string): boolean {
      chunks.push(chunk);
      return true;
    },
  };
}

function createTempProject(name: string, packageName = '@nntoan/gstack'): string {
  const root = join(process.cwd(), '.memory', 'tests', name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify(
      { name: packageName, version: '0.0.0-test', scripts: { test: 'vitest' } },
      null,
      2
    ),
    'utf-8'
  );
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'README.md'), '# Test Project\n', 'utf-8');
  return root;
}

function createExec(state: FakeExecState) {
  return (args: string[]) => {
    if (args[0] !== 'memoir') {
      return { exitCode: 1, stdout: '', stderr: `Unexpected command: ${args.join(' ')}` };
    }

    const memoirName = args.includes('--memoir')
      ? (args[args.indexOf('--memoir') + 1] as string)
      : args.includes('--name')
        ? (args[args.indexOf('--name') + 1] as string)
        : '';

    if (args[1] === 'export') {
      if (!state.memoirs.has(memoirName)) {
        return { exitCode: 1, stdout: '', stderr: `Error: memoir not found: ${memoirName}` };
      }
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          memoir: { name: memoirName, description: '', created_at: '', updated_at: '' },
          concepts: state.graph.concepts,
          links: state.graph.links,
        }),
        stderr: '',
      };
    }

    if (args[1] === 'create') {
      state.memoirs.add(memoirName);
      return { exitCode: 0, stdout: 'created', stderr: '' };
    }

    if (args[1] === 'add-concept') {
      const name = args[args.indexOf('--name') + 1] as string;
      const definition = args[args.indexOf('--definition') + 1] as string;
      const labels = (args[args.indexOf('--labels') + 1] as string).split(',');
      state.graph.concepts.push({ name, definition, labels });
      return { exitCode: 0, stdout: 'added', stderr: '' };
    }

    if (args[1] === 'refine') {
      const name = args[args.indexOf('--name') + 1] as string;
      const definition = args[args.indexOf('--definition') + 1] as string;
      const concept = state.graph.concepts.find((item) => item.name === name);
      if (!concept) {
        return { exitCode: 1, stdout: '', stderr: `Error: concept not found: ${name}` };
      }
      concept.definition = definition;
      return { exitCode: 0, stdout: 'refined', stderr: '' };
    }

    if (args[1] === 'link') {
      const source = args[args.indexOf('--from') + 1] as string;
      const target = args[args.indexOf('--to') + 1] as string;
      const relation = args[args.indexOf('--relation') + 1] as string;
      state.graph.links.push({ source, relation, target });
      return { exitCode: 0, stdout: 'linked', stderr: '' };
    }

    return { exitCode: 1, stdout: '', stderr: `Unhandled memoir subcommand: ${args[1]}` };
  };
}

describe('runMemoirRefreshWithOptions', () => {
  it('creates and populates the gstack memoir when targeting the gstack repo', async () => {
    const projectDir = createTempProject('memoir-create-gstack');
    const stdout = createWriter();
    const state: FakeExecState = {
      memoirs: new Set(),
      graph: { concepts: [], links: [] },
    };

    const result = await runMemoirRefreshWithOptions({
      projectDir,
      stdout,
      exec: createExec(state),
    });

    expect(result.memoirName).toBe('gstack-opencode');
    expect(result.createdMemoir).toBe(true);
    expect(result.conceptsAdded).toBeGreaterThan(20);
    expect(result.linksAdded).toBeGreaterThan(20);
    expect(stdout.chunks.join('')).toContain('Memoir refresh for gstack-opencode');
  });

  it('refines changed concepts and skips duplicate links for the gstack profile', async () => {
    const projectDir = createTempProject('memoir-refine-gstack');
    const stdout = createWriter();
    const state: FakeExecState = {
      memoirs: new Set(['gstack-opencode']),
      graph: {
        concepts: [
          {
            name: 'gstack-opencode-product',
            definition: 'stale definition',
            labels: ['domain:product', 'type:system', 'status:stable'],
          },
          {
            name: 'plugin-bootstrap-flow',
            definition:
              'In src/index.ts, GstackPlugin is the composition root. Startup order is loadPluginConfig -> ensureWorkspaceDir -> createSkillsAndAgents -> createManagers -> createOrchestrator -> new DelegationStateManager -> createTools -> createHooks -> createPluginInterface. Edit this flow when wiring new top-level runtime behavior or changing boot-time dependencies.',
            labels: ['domain:runtime', 'type:process', 'status:stable'],
          },
        ],
        links: [
          {
            source: 'plugin-bootstrap-flow',
            relation: 'part_of',
            target: 'gstack-opencode-product',
          },
        ],
      },
    };

    const result = await runMemoirRefreshWithOptions({
      projectDir,
      stdout,
      exec: createExec(state),
    });

    expect(result.createdMemoir).toBe(false);
    expect(result.conceptsRefined).toBeGreaterThanOrEqual(1);
    expect(result.linksSkipped).toBeGreaterThanOrEqual(1);
    const productConcept = state.graph.concepts.find(
      (concept) => concept.name === 'gstack-opencode-product'
    );
    expect(productConcept?.definition).toContain('OpenCode plugin plus CLI');
  });

  it('supports dry-run mode without mutating the memoir graph', async () => {
    const projectDir = createTempProject('memoir-dry-run');
    const stdout = createWriter();
    const state: FakeExecState = {
      memoirs: new Set(),
      graph: { concepts: [], links: [] },
    };

    const result = await runMemoirRefreshWithOptions({
      projectDir,
      dryRun: true,
      stdout,
      exec: createExec(state),
    });

    expect(result.dryRun).toBe(true);
    expect(state.memoirs.size).toBe(0);
    expect(state.graph.concepts).toHaveLength(0);
    expect(state.graph.links).toHaveLength(0);
    expect(result.conceptsAdded).toBeGreaterThan(20);
    expect(stdout.chunks.join('')).toContain('Mode: dry run');
  });

  it('creates a generic memoir for non-gstack repositories', async () => {
    const projectDir = createTempProject('memoir-generic', 'acme/example-app');
    const stdout = createWriter();
    const state: FakeExecState = {
      memoirs: new Set(),
      graph: { concepts: [], links: [] },
    };

    const result = await runMemoirRefreshWithOptions({
      projectDir,
      stdout,
      exec: createExec(state),
    });

    expect(result.memoirName).toBe('acme-example-app');
    expect(result.createdMemoir).toBe(true);
    expect(result.conceptsAdded).toBeGreaterThanOrEqual(7);
    expect(result.linksAdded).toBeGreaterThanOrEqual(8);
    expect(stdout.chunks.join('')).toContain('Memoir refresh for acme-example-app');
  });

  it('supports overriding the memoir name for arbitrary repositories', async () => {
    const projectDir = createTempProject('memoir-name-override', 'acme/internal-tool');
    const stdout = createWriter();
    const state: FakeExecState = {
      memoirs: new Set(),
      graph: { concepts: [], links: [] },
    };

    const result = await runMemoirRefreshWithOptions({
      projectDir,
      memoirName: 'custom-memoir-name',
      stdout,
      exec: createExec(state),
    });

    expect(result.memoirName).toBe('custom-memoir-name');
    expect(stdout.chunks.join('')).toContain('Memoir refresh for custom-memoir-name');
  });
});
