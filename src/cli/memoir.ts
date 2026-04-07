import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const ICM_BIN = 'icm';
const GSTACK_PACKAGE_NAME = '@nntoan/gstack';
const GSTACK_MEMOIR_NAME = 'gstack-opencode';
const GSTACK_MEMOIR_DESCRIPTION =
  'Curated architecture graph for the gstack OpenCode plugin, CLI, and runtime subsystems';
const PROJECT_MARKERS = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'];
const INTERESTING_FILES = new Set([
  'package.json',
  'README.md',
  'README',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'tsconfig.json',
  'tsconfig.build.json',
  'bunfig.toml',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'Makefile',
]);
const SOURCE_DIR_CANDIDATES = [
  'src',
  'app',
  'lib',
  'packages',
  'server',
  'client',
  'frontend',
  'backend',
  'services',
  'scripts',
];
const TEST_DIR_CANDIDATES = ['test', 'tests', '__tests__', 'e2e', 'spec', 'specs'];
const WORKFLOW_DIR = ['.github', 'workflows'];
const ALLOWED_HIDDEN_DIRS = new Set(['.github', '.claude', '.opencode']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

type MemoirRelation =
  | 'part-of'
  | 'depends-on'
  | 'related-to'
  | 'contradicts'
  | 'refines'
  | 'alternative-to'
  | 'caused-by'
  | 'instance-of'
  | 'superseded-by';

interface Writer {
  write: (chunk: string) => unknown;
}

interface MemoirCliArgs {
  project?: string;
  memoirName?: string;
  dryRun: boolean;
}

export interface MemoirRefreshOptions {
  projectDir?: string;
  memoirName?: string;
  dryRun?: boolean;
  stdout?: Writer;
  stderr?: Writer;
  exec?: IcmExecutor;
}

export interface MemoirRefreshResult {
  memoirName: string;
  projectDir: string;
  createdMemoir: boolean;
  dryRun: boolean;
  conceptsAdded: number;
  conceptsRefined: number;
  conceptsSkipped: number;
  linksAdded: number;
  linksSkipped: number;
  labelMismatches: string[];
  totalConcepts: number;
  totalLinks: number;
}

interface IcmCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

type IcmExecutor = (args: string[], cwd: string) => IcmCommandResult;

interface MemoirConceptSeed {
  name: string;
  definition: string;
  labels: string[];
}

interface MemoirLinkSeed {
  from: string;
  to: string;
  relation: MemoirRelation;
}

interface MemoirProfile {
  memoirName: string;
  description: string;
  concepts: MemoirConceptSeed[];
  links: MemoirLinkSeed[];
}

interface PackageJsonShape {
  name?: string;
  scripts?: Record<string, string>;
}

interface ProjectSnapshot {
  projectDir: string;
  packageName: string | null;
  dirName: string;
  primaryStack: string;
  topLevelDirs: string[];
  topLevelFiles: string[];
  documentationFiles: string[];
  sourceDirs: string[];
  testDirs: string[];
  manifestFiles: string[];
  configFiles: string[];
  workflowFiles: string[];
  packageScripts: string[];
}

interface ExportedConcept {
  name: string;
  definition: string;
  labels?: string[];
}

interface ExportedLink {
  source: string;
  target: string;
  relation: string;
}

interface ExportedMemoirGraph {
  concepts?: ExportedConcept[];
  links?: ExportedLink[];
}

const GSTACK_MEMOIR_CONCEPTS: MemoirConceptSeed[] = [
  {
    name: 'gstack-opencode-product',
    definition:
      '@nntoan/gstack is an OpenCode plugin plus CLI for structured multi-agent engineering. The main runtime entry is src/index.ts:GstackPlugin; the core navigation points are src/plugin-interface.ts, src/create-managers.ts, src/create-skills-and-agents.ts, src/features/orchestrator/*, src/features/workspace-state/*, src/features/skill-mcp-manager/*, and src/features/browser-daemon/*. Future agents should start from this product root, then jump to linked concepts for exact files and responsible symbols.',
    labels: ['domain:product', 'type:system', 'status:stable'],
  },
  {
    name: 'plugin-bootstrap-flow',
    definition:
      'In src/index.ts, GstackPlugin is the composition root. Startup order is loadPluginConfig -> ensureWorkspaceDir -> createSkillsAndAgents -> createManagers -> createOrchestrator -> new DelegationStateManager -> createTools -> createHooks -> createPluginInterface. Edit this flow when wiring new top-level runtime behavior or changing boot-time dependencies.',
    labels: ['domain:runtime', 'type:process', 'status:stable'],
  },
  {
    name: 'config-loading',
    definition:
      'In src/plugin-config.ts, loadPluginConfig(directory, ctx) loads ~/.config/opencode/gstack.jsonc or .json plus project .opencode/gstack.jsonc or .json, validates with GstackConfigSchema, merges with mergeConfigs and deepMerge, and falls back to schema defaults. Supporting helpers are loadConfigFromPath and parseConfigPartially. Use this file when agent, MCP, hook, or skill availability changes at startup.',
    labels: ['domain:config', 'type:process', 'status:stable'],
  },
  {
    name: 'skills-agents-composition',
    definition:
      'In src/create-skills-and-agents.ts, createSkillsAndAgents(config) builds runtime skill and agent lists. It calls createBuiltinSkills from src/features/builtin-skills/skills.ts and createGstackAgents from src/agents/index.ts, then applies per-agent model and instruction overrides from config.agents using resolveAgentModelDefaults. This is the entrypoint for enabling, filtering, or customizing the agent and skill inventory.',
    labels: ['domain:registry', 'type:factory', 'status:stable'],
  },
  {
    name: 'managers-composition',
    definition:
      'In src/create-managers.ts, createManagers({ ctx, pluginConfig, skills, agents }) constructs cross-cutting runtime services: SkillMcpManager, DeferredMcpInvoker, createSprintBacklog(mcpInvoker), createWorkspaceState(ctx.directory), analytics, and configHandler. This file is the central dependency assembly point for MCP access, backlog access, workspace persistence, and hook plus plugin integration.',
    labels: ['domain:runtime', 'type:factory', 'status:stable'],
  },
  {
    name: 'plugin-interface-runtime',
    definition:
      'In src/plugin-interface.ts, createPluginInterface returns host handlers for chat.message, experimental.chat.system.transform, event, and tool hooks. chat.message extracts text parts, runs orchestrator intent classification and delegation, and stores per-session delegation in DelegationStateManager; session.deleted completes workspaceState.sessions and disconnects SkillMcpManager. Use this file when live OpenCode runtime behavior, routing, or delegation application must change.',
    labels: ['domain:runtime', 'type:adapter', 'status:stable'],
  },
  {
    name: 'orchestrator-routing',
    definition:
      'In src/features/orchestrator/index.ts, createOrchestrator wraps the intent classification and delegation pipeline. Core routing files are intent-classifier.ts for classifyIntent and explicit skill extraction, intent-patterns.ts for PHASE_PATTERNS, SKILL_TO_PHASE_MAP, and PHASE_TO_DEFAULT_AGENT, delegation-engine.ts for delegateIntent and getPhaseSkills, and delegation-state.ts for DelegationStateManager. Use this subsystem for intent routing, delegation behavior, classify logic, skill selection, and agent assignment.',
    labels: ['domain:orchestrator', 'type:system', 'status:stable'],
  },
  {
    name: 'workspace-state-api',
    definition:
      'In src/features/workspace-state/index.ts, createWorkspaceState(directory) is the single API for persistent workspace state and cross-session context. It exposes boulder.read/write/append/clear/upsert for boulder state, plans.getProgress/getName/find for plan progress, sessions via createSessionTracker for session records, reviews via createReviewDashboard, notepads(planName), and ensureDir. Paths are resolved in src/shared/path-helpers.ts via getBoulderPath, getPlansDir, getSessionsDir, getNotepadsDir, and getReviewsDir.',
    labels: ['domain:persistence', 'type:api', 'status:stable'],
  },
  {
    name: 'boulder-state-storage',
    definition:
      'In src/features/workspace-state/boulder-storage.ts, readBoulderState and writeBoulderState persist .gstack/orchestrator/boulder.json as the main workspace state file. The BoulderState schema in src/features/workspace-state/types.ts stores active_plan, plan_name, session_ids, current_phase, agent, and task_sessions; createBoulderState seeds a new record, appendSessionId adds session history, and upsertTaskSessionState maps task keys to session metadata. Use this module when tracing boulder state, sessions, or plan progress pointers across sessions.',
    labels: ['domain:persistence', 'type:storage', 'status:stable'],
  },
  {
    name: 'session-continuity-hooks',
    definition:
      'In src/create-hooks.ts, session continuity is registered through createBoulderHook, createProgressHook, and createRecoveryHook from src/features/session-continuity/*. recovery-hook.ts reads workspaceState.boulder and workspaceState.plans.getProgress to inject Session Recovery context when a session has no active delegation. Use this area when future sessions should automatically regain prior plan, phase, and agent context.',
    labels: ['domain:persistence', 'type:hook', 'status:stable'],
  },
  {
    name: 'skill-mcp-lifecycle',
    definition:
      'In src/features/skill-mcp-manager/manager.ts, SkillMcpManager owns session-scoped MCP client lifecycle. It creates or reuses clients via connection.ts:getOrCreateClient and getOrCreateClientWithRetryImpl, lists tools and resources, calls tool handlers, reads resources, and disconnects sessions. createManagers wires this manager into runtime services so skills can reach external MCP servers safely.',
    labels: ['domain:mcp', 'type:system', 'status:stable'],
  },
  {
    name: 'sprint-backlog-integration',
    definition:
      'In src/features/sprint-backlog/index.ts, createSprintBacklog(mcpTools) assembles BacklogClient, ThinkPlanTaskCreator, BuildStatusUpdater, and ShipReadinessChecker. The BacklogClient implementation in backlog-client.ts persists backlog operations through the backlog MCP provider rather than local .gstack files. Use this concept when task planning or ship readiness depends on external backlog state.',
    labels: ['domain:backlog', 'type:system', 'status:stable'],
  },
  {
    name: 'browser-daemon-server',
    definition:
      'In src/features/browser-daemon/server.ts, startServer boots the local Playwright daemon. It resolves config, ensures browser state dir, chooses a localhost port, mints an auth token, writes a state file, serves /health and /command, and dispatches commands through handleReadCommand, handleWriteCommand, and handleMetaCommand. This is the authoritative boundary for browser automation.',
    labels: ['domain:browser', 'type:server', 'status:stable'],
  },
  {
    name: 'browser-manager-lifecycle',
    definition:
      'In src/features/browser-daemon/browser-manager.ts, BrowserManager owns Playwright context lifecycle: launch, close, tab management, page lookup, saveState, restoreState, recreateContext, and handoff or resume. server.ts depends on this class for health checks and command execution, while buffers.ts captures console, network, and dialog events. Use this file for page lifecycle or browser state bugs.',
    labels: ['domain:browser', 'type:class', 'status:stable'],
  },
  {
    name: 'workspace-path-map',
    definition:
      'In src/shared/path-helpers.ts, getGstackDir, getOrchestratorDir, getPlansDir, getSessionsDir, getNotepadsDir, getReviewsDir, getAnalyticsDir, getBoulderPath, getStatePath, getSprintLogPath, and getBrowseStatePath define the exact durable filesystem layout under .gstack. Consult this file before searching for persisted artifacts manually.',
    labels: ['domain:persistence', 'type:path-map', 'status:stable'],
  },
  {
    name: 'cross-session-lookup-playbook',
    definition:
      'For future OpenCode sessions, the fastest persistent lookup path is: start at src/index.ts:GstackPlugin, then inspect src/create-managers.ts:createManagers and src/plugin-interface.ts:createPluginInterface, then use src/features/workspace-state/index.ts:createWorkspaceState to read boulder, plans, sessions, reviews, and notepads. If the question is about routing, jump to src/features/orchestrator/*. If it is about external tools, jump to src/features/skill-mcp-manager/*. If it is about browser automation, jump to src/features/browser-daemon/server.ts and browser-manager.ts. This concept is the reusable orientation map for all agents.',
    labels: ['domain:memory', 'type:process', 'status:stable'],
  },
  {
    name: 'intent-delegation-routing',
    definition:
      'Alias concept for discoverability: the intent delegation routing subsystem lives in src/features/orchestrator/index.ts, intent-classifier.ts, intent-patterns.ts, delegation-engine.ts, and delegation-state.ts. This is where message text is classified, mapped to phases, assigned skills, and delegated to agents.',
    labels: ['domain:orchestrator', 'type:system', 'status:stable'],
  },
  {
    name: 'hook-registry-system',
    definition:
      'In src/features/hooks/hook-registry.ts, createHookRegistry stores HookDefinition handlers by HookEventName, filters tool events via toolFilter with matchesTool, and dispatches hooks with per-hook error logging. The public barrel is src/features/hooks/index.ts and the type contracts live in src/types/hooks.ts. Use this subsystem when adding runtime instrumentation or output transforms.',
    labels: ['domain:hooks', 'type:system', 'status:stable'],
  },
  {
    name: 'tool-output-truncation',
    definition:
      'In src/features/hooks/tool-output-truncator.ts, createToolOutputTruncator clamps grep, glob, and bash output during tool.execute.after events to MAX_TOOL_OUTPUT_LENGTH = 50000. This hook protects prompt size and prevents oversized tool payloads from overflowing the model context.',
    labels: ['domain:hooks', 'type:hook', 'status:stable'],
  },
  {
    name: 'quality-gates-engine',
    definition:
      'In src/features/quality-gates/gate-engine.ts, createGateEngine stores GateDefinition lists keyed by GateTransition strings like think->plan and exposes register, evaluate, and getGatesForTransition. create-hooks.ts builds this engine, registers createDefaultGates(), and passes it into createGateHook so system.transform can surface transition warnings and blocks.',
    labels: ['domain:quality', 'type:system', 'status:stable'],
  },
  {
    name: 'quality-gate-defaults',
    definition:
      'In src/features/quality-gates/default-gates.ts, createDefaultGates defines the stock transition policies require-user-confirmation (think->plan), require-approved-plan (plan->build), and require-passing-tests (build->review). src/features/quality-gates/gate-hook.ts:getNextPhases computes adjacent transitions and createGateHook injects warning or block text into system output.',
    labels: ['domain:quality', 'type:policy', 'status:stable'],
  },
  {
    name: 'quality-scorecard-hooks',
    definition:
      'In src/features/quality-scorecard/*.ts, createScorecardHook, createDelegationContextHook, createSkillUsageHook, createSessionTrackingHook, and createSprintLogHook add runtime quality telemetry. They enrich system output with review status, ship readiness hints, recent skill usage, active plan reminders, session records, and sprint phase history.',
    labels: ['domain:quality', 'type:hook-group', 'status:stable'],
  },
  {
    name: 'analytics-writer',
    definition:
      'In src/features/analytics/writer.ts, appendJsonl(filePath, event) and readJsonl(filePath) are the low-level persistence primitives for analytics JSONL files, with directory creation and error logging. Higher-level trackers wrap these functions to record skill usage, sprint phases, token metrics, and Eureka events.',
    labels: ['domain:analytics', 'type:storage', 'status:stable'],
  },
  {
    name: 'skill-usage-analytics',
    definition:
      'In src/features/analytics/skill-usage-tracker.ts, createSkillUsageTracker writes skill-usage.jsonl under analyticsDir and returns record/getRecent methods. src/features/quality-scorecard/skill-usage-hook.ts records one event per delegated skill when a session changes phase, making this the canonical source for recent skill history in the quality scorecard.',
    labels: ['domain:analytics', 'type:tracker', 'status:stable'],
  },
  {
    name: 'sprint-log-analytics',
    definition:
      'In src/features/analytics/sprint-logger.ts, createSprintLogger writes .gstack/orchestrator/sprint-log.jsonl via log/getPhaseHistory. src/features/quality-scorecard/sprint-log-hook.ts emits started and completed phase events when DelegationStateManager changes phase, making this the canonical cross-session sprint trail.',
    labels: ['domain:analytics', 'type:tracker', 'status:stable'],
  },
  {
    name: 'browser-command-registry',
    definition:
      'In src/features/browser-daemon/commands.ts, READ_COMMANDS, WRITE_COMMANDS, META_COMMANDS, ALL_COMMANDS, and COMMAND_DESCRIPTIONS are the single source of truth for browse command taxonomy and help text. server.ts dispatches through handleReadCommand, handleWriteCommand, and handleMetaCommand based on these sets, while commands.ts self-validates that every command has a description entry.',
    labels: ['domain:browser', 'type:registry', 'status:stable'],
  },
  {
    name: 'builtin-skills-registry',
    definition:
      'In src/features/builtin-skills/skills.ts, ALL_SKILLS and createBuiltinSkills filter the builtin workflow catalog by disabledSkills, browserRequired availability, and the slim preset via isSlimSkill. Safety-critical templates live in skills/ship.ts, skills/guard.ts, and skills/document-release.ts, so this registry is the canonical place to reason about installed skill surface area.',
    labels: ['domain:skills', 'type:registry', 'status:stable'],
  },
  {
    name: 'agents-registry',
    definition:
      'In src/agents/index.ts, ALL_AGENTS is the canonical registry of 13 built-in agents and createGstackAgents filters it by disabledAgents and orchestrationMode. getAgentByRole and getAgentsByPhase provide lookup helpers, while src/create-skills-and-agents.ts applies model and instruction overrides from config.agents.',
    labels: ['domain:agents', 'type:registry', 'status:stable'],
  },
  {
    name: 'gstack-config-schema',
    definition:
      'In src/config/schema/main.ts, GstackConfigSchema defines orchestration_mode, preset, disabled_* lists, agent_registration, agents, categories, runtime_fallback, mcp, backlog, browser, telemetry, and token_budget. Subschemas in agent-schema.ts, mcp-schema.ts, and browser-schema.ts drive how config-loading validates per-agent overrides, MCP providers, and browser behavior before startup wiring.',
    labels: ['domain:config', 'type:schema', 'status:stable'],
  },
];

const GSTACK_MEMOIR_LINKS: MemoirLinkSeed[] = [
  { from: 'plugin-bootstrap-flow', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'config-loading', to: 'plugin-bootstrap-flow', relation: 'part-of' },
  { from: 'config-loading', to: 'gstack-config-schema', relation: 'depends-on' },
  { from: 'skills-agents-composition', to: 'plugin-bootstrap-flow', relation: 'part-of' },
  { from: 'skills-agents-composition', to: 'builtin-skills-registry', relation: 'depends-on' },
  { from: 'skills-agents-composition', to: 'agents-registry', relation: 'depends-on' },
  { from: 'managers-composition', to: 'plugin-bootstrap-flow', relation: 'part-of' },
  { from: 'managers-composition', to: 'skill-mcp-lifecycle', relation: 'depends-on' },
  { from: 'managers-composition', to: 'workspace-state-api', relation: 'depends-on' },
  { from: 'managers-composition', to: 'sprint-backlog-integration', relation: 'depends-on' },
  { from: 'plugin-interface-runtime', to: 'plugin-bootstrap-flow', relation: 'part-of' },
  { from: 'plugin-interface-runtime', to: 'managers-composition', relation: 'depends-on' },
  { from: 'plugin-interface-runtime', to: 'hook-registry-system', relation: 'related-to' },
  { from: 'orchestrator-routing', to: 'plugin-interface-runtime', relation: 'depends-on' },
  { from: 'workspace-state-api', to: 'workspace-path-map', relation: 'depends-on' },
  { from: 'workspace-state-api', to: 'boulder-state-storage', relation: 'depends-on' },
  { from: 'session-continuity-hooks', to: 'workspace-state-api', relation: 'depends-on' },
  { from: 'session-continuity-hooks', to: 'orchestrator-routing', relation: 'depends-on' },
  { from: 'browser-daemon-server', to: 'browser-manager-lifecycle', relation: 'depends-on' },
  { from: 'browser-daemon-server', to: 'browser-command-registry', relation: 'depends-on' },
  { from: 'browser-daemon-server', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'cross-session-lookup-playbook', to: 'gstack-opencode-product', relation: 'refines' },
  { from: 'cross-session-lookup-playbook', to: 'plugin-bootstrap-flow', relation: 'depends-on' },
  { from: 'cross-session-lookup-playbook', to: 'workspace-state-api', relation: 'depends-on' },
  { from: 'cross-session-lookup-playbook', to: 'orchestrator-routing', relation: 'depends-on' },
  { from: 'intent-delegation-routing', to: 'orchestrator-routing', relation: 'refines' },
  { from: 'hook-registry-system', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'tool-output-truncation', to: 'hook-registry-system', relation: 'part-of' },
  { from: 'quality-gates-engine', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'quality-gate-defaults', to: 'quality-gates-engine', relation: 'part-of' },
  { from: 'quality-scorecard-hooks', to: 'hook-registry-system', relation: 'depends-on' },
  { from: 'quality-scorecard-hooks', to: 'workspace-state-api', relation: 'depends-on' },
  { from: 'quality-scorecard-hooks', to: 'orchestrator-routing', relation: 'depends-on' },
  { from: 'quality-scorecard-hooks', to: 'skill-usage-analytics', relation: 'depends-on' },
  { from: 'quality-scorecard-hooks', to: 'sprint-log-analytics', relation: 'depends-on' },
  { from: 'analytics-writer', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'skill-usage-analytics', to: 'analytics-writer', relation: 'depends-on' },
  { from: 'sprint-log-analytics', to: 'analytics-writer', relation: 'depends-on' },
  { from: 'builtin-skills-registry', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'agents-registry', to: 'gstack-opencode-product', relation: 'part-of' },
  { from: 'gstack-config-schema', to: 'gstack-opencode-product', relation: 'part-of' },
];

function defaultIcmExecutor(args: string[], cwd: string): IcmCommandResult {
  try {
    const proc = Bun.spawnSync([ICM_BIN, ...args], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    return {
      exitCode: proc.exitCode,
      stdout: proc.stdout.toString(),
      stderr: proc.stderr.toString(),
    };
  } catch (error: unknown) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseMemoirCliArgs(argv: string[]): MemoirCliArgs {
  const getArg = (name: string): string | undefined => {
    const index = argv.findIndex((item) => item === name);
    if (index < 0) return undefined;
    return argv[index + 1];
  };

  return {
    project: getArg('--project'),
    memoirName: getArg('--memoir-name'),
    dryRun: argv.includes('--dry-run'),
  };
}

function readPackageJson(projectDir: string): PackageJsonShape | null {
  const packagePath = join(projectDir, 'package.json');
  if (!existsSync(packagePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(packagePath, 'utf-8')) as PackageJsonShape;
  } catch {
    return null;
  }
}

function pathIsDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function pathExists(filePath: string): boolean {
  return existsSync(filePath);
}

function hasProjectMarkers(directory: string): boolean {
  if (pathExists(join(directory, '.git'))) {
    return true;
  }

  return PROJECT_MARKERS.some((marker) => pathExists(join(directory, marker)));
}

function findProjectDir(startPath: string): string | null {
  let current = resolve(startPath);
  if (!pathIsDirectory(current)) {
    current = dirname(current);
  }

  while (true) {
    if (hasProjectMarkers(current)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function listTopLevelEntries(projectDir: string): { dirs: string[]; files: string[] } {
  const dirs: string[] = [];
  const files: string[] = [];

  for (const entry of readdirSync(projectDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      if (entry.name.startsWith('.') && !ALLOWED_HIDDEN_DIRS.has(entry.name)) {
        continue;
      }
      dirs.push(entry.name);
      continue;
    }

    files.push(entry.name);
  }

  dirs.sort((a, b) => a.localeCompare(b));
  files.sort((a, b) => a.localeCompare(b));
  return { dirs, files };
}

function detectPrimaryStack(projectDir: string, packageJson: PackageJsonShape | null): string {
  if (packageJson) {
    if (pathExists(join(projectDir, 'bunfig.toml'))) {
      return 'TypeScript/JavaScript with Bun';
    }
    return 'TypeScript/JavaScript';
  }
  if (pathExists(join(projectDir, 'pyproject.toml'))) {
    return 'Python';
  }
  if (pathExists(join(projectDir, 'Cargo.toml'))) {
    return 'Rust';
  }
  if (pathExists(join(projectDir, 'go.mod'))) {
    return 'Go';
  }
  return 'Unknown';
}

function filterExisting(candidates: string[], projectDir: string): string[] {
  return candidates.filter((candidate) => pathExists(join(projectDir, candidate)));
}

function listWorkflowFiles(projectDir: string): string[] {
  const workflowsDir = join(projectDir, ...WORKFLOW_DIR);
  if (!pathIsDirectory(workflowsDir)) {
    return [];
  }

  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => `.github/workflows/${name}`)
    .sort((a, b) => a.localeCompare(b));
}

function toSentence(items: string[], fallback: string): string {
  return items.length > 0 ? items.join(', ') : fallback;
}

function slugify(value: string): string {
  const normalized = value
    .replace(/^@/, '')
    .replace(/[\/]/g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return normalized.length > 0 ? normalized : 'project';
}

function buildProjectSnapshot(projectDir: string): ProjectSnapshot {
  const packageJson = readPackageJson(projectDir);
  const entries = listTopLevelEntries(projectDir);
  const documentationFiles = entries.files.filter(
    (name) => name === 'README' || name.endsWith('.md')
  );
  const configFiles = entries.files.filter((name) => INTERESTING_FILES.has(name));

  return {
    projectDir,
    packageName: packageJson?.name ?? null,
    dirName: basename(projectDir),
    primaryStack: detectPrimaryStack(projectDir, packageJson),
    topLevelDirs: entries.dirs,
    topLevelFiles: entries.files,
    documentationFiles,
    sourceDirs: filterExisting(SOURCE_DIR_CANDIDATES, projectDir),
    testDirs: filterExisting(TEST_DIR_CANDIDATES, projectDir),
    manifestFiles: PROJECT_MARKERS.filter((marker) => pathExists(join(projectDir, marker))),
    configFiles,
    workflowFiles: listWorkflowFiles(projectDir),
    packageScripts: Object.keys(packageJson?.scripts ?? {}).sort((a, b) => a.localeCompare(b)),
  };
}

function buildGenericProfile(snapshot: ProjectSnapshot, memoirName: string): MemoirProfile {
  const projectSlug = slugify(memoirName);
  const projectConcept = `${projectSlug}-project-overview`;
  const entrypointsConcept = `${projectSlug}-entrypoints`;
  const sourceConcept = `${projectSlug}-source-layout`;
  const testsConcept = `${projectSlug}-test-layout`;
  const toolingConcept = `${projectSlug}-tooling-manifests`;
  const automationConcept = `${projectSlug}-automation`;
  const docsConcept = `${projectSlug}-documentation`;
  const scriptsConcept = `${projectSlug}-scripts`;

  const concepts: MemoirConceptSeed[] = [
    {
      name: projectConcept,
      definition:
        `${snapshot.packageName ?? snapshot.dirName} is a ${snapshot.primaryStack} project rooted at ${snapshot.projectDir}. ` +
        `Top-level directories: ${toSentence(snapshot.topLevelDirs, 'none detected')}. ` +
        `Top-level files: ${toSentence(snapshot.topLevelFiles.slice(0, 12), 'none detected')}. ` +
        'Start future investigation from this root concept, then jump to the linked layout and tooling concepts.',
      labels: ['domain:project', 'type:system', 'status:generated'],
    },
    {
      name: entrypointsConcept,
      definition:
        `Likely runtime entrypoints and executable surfaces live in ${toSentence(snapshot.sourceDirs, 'no conventional source directories detected')} plus scripts or manifests ${toSentence(snapshot.manifestFiles, 'none detected')}. ` +
        `Use package scripts ${toSentence(snapshot.packageScripts.slice(0, 10), 'none detected')} and top-level files ${toSentence(snapshot.topLevelFiles.slice(0, 10), 'none detected')} to trace startup paths.`,
      labels: ['domain:project', 'type:entrypoints', 'status:generated'],
    },
    {
      name: sourceConcept,
      definition:
        `Primary source layout for this repository appears under ${toSentence(snapshot.sourceDirs, 'no standard source directories detected')}. ` +
        `Additional top-level directories include ${toSentence(snapshot.topLevelDirs, 'none detected')}. ` +
        'Use this concept to orient code navigation before drilling into specific modules.',
      labels: ['domain:project', 'type:layout', 'status:generated'],
    },
    {
      name: testsConcept,
      definition:
        `Testing and verification directories detected: ${toSentence(snapshot.testDirs, 'none detected')}. ` +
        `Package scripts relevant to validation include ${toSentence(
          snapshot.packageScripts.filter((name) => /test|lint|check|type/i.test(name)),
          'none detected'
        )}.`,
      labels: ['domain:project', 'type:tests', 'status:generated'],
    },
    {
      name: toolingConcept,
      definition:
        `Tooling manifests and config entrypoints include ${toSentence(snapshot.configFiles, 'none detected')} and core markers ${toSentence(snapshot.manifestFiles, 'none detected')}. ` +
        `This concept is the fastest way to locate build, package, and environment configuration for ${snapshot.packageName ?? snapshot.dirName}.`,
      labels: ['domain:project', 'type:tooling', 'status:generated'],
    },
    {
      name: automationConcept,
      definition:
        `Automation surfaces include workflow files ${toSentence(snapshot.workflowFiles, 'none detected')} and runnable scripts ${toSentence(snapshot.packageScripts, 'none detected')}. ` +
        'Inspect this concept when tracing CI, release automation, or local task execution.',
      labels: ['domain:project', 'type:automation', 'status:generated'],
    },
    {
      name: docsConcept,
      definition:
        `Human-oriented documentation files at the repository root include ${toSentence(snapshot.documentationFiles, 'none detected')}. ` +
        'Use these files to recover project conventions, architecture notes, and contributor workflow before editing code.',
      labels: ['domain:project', 'type:docs', 'status:generated'],
    },
  ];

  if (snapshot.packageScripts.length > 0) {
    concepts.push({
      name: scriptsConcept,
      definition:
        `Package scripts declared for this repository are ${snapshot.packageScripts.join(', ')}. ` +
        'These are the primary user-facing automation entrypoints when the project is Node/Bun-based.',
      labels: ['domain:project', 'type:scripts', 'status:generated'],
    });
  }

  const links: MemoirLinkSeed[] = [
    { from: entrypointsConcept, to: projectConcept, relation: 'part-of' },
    { from: sourceConcept, to: projectConcept, relation: 'part-of' },
    { from: testsConcept, to: projectConcept, relation: 'part-of' },
    { from: toolingConcept, to: projectConcept, relation: 'part-of' },
    { from: automationConcept, to: toolingConcept, relation: 'depends-on' },
    { from: docsConcept, to: projectConcept, relation: 'part-of' },
    { from: entrypointsConcept, to: sourceConcept, relation: 'depends-on' },
    { from: testsConcept, to: sourceConcept, relation: 'related-to' },
  ];

  if (snapshot.packageScripts.length > 0) {
    links.push({ from: scriptsConcept, to: toolingConcept, relation: 'depends-on' });
    links.push({ from: scriptsConcept, to: automationConcept, relation: 'related-to' });
  }

  return {
    memoirName,
    description: `Generated architecture starter graph for ${snapshot.packageName ?? snapshot.dirName}`,
    concepts,
    links,
  };
}

function buildProfile(projectDir: string, memoirNameOverride?: string): MemoirProfile {
  const snapshot = buildProjectSnapshot(projectDir);
  const defaultMemoirName =
    snapshot.packageName === GSTACK_PACKAGE_NAME
      ? GSTACK_MEMOIR_NAME
      : slugify(snapshot.packageName ?? snapshot.dirName);
  const memoirName = memoirNameOverride ?? defaultMemoirName;

  if (snapshot.packageName === GSTACK_PACKAGE_NAME) {
    return {
      memoirName,
      description: GSTACK_MEMOIR_DESCRIPTION,
      concepts: GSTACK_MEMOIR_CONCEPTS,
      links: GSTACK_MEMOIR_LINKS,
    };
  }

  return buildGenericProfile(snapshot, memoirName);
}

function normalizeLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => a.localeCompare(b));
}

function normalizeRelation(relation: string): MemoirRelation {
  return relation.replace(/_/g, '-') as MemoirRelation;
}

function linkKey(from: string, relation: string, to: string): string {
  return `${from}|${normalizeRelation(relation)}|${to}`;
}

function parseExportedGraph(raw: string): ExportedMemoirGraph {
  const parsed = JSON.parse(raw) as ExportedMemoirGraph;
  return {
    concepts: parsed.concepts ?? [],
    links: parsed.links ?? [],
  };
}

function isMissingMemoirError(stderr: string): boolean {
  return stderr.toLowerCase().includes('memoir not found');
}

function ensureSuccess(result: IcmCommandResult, action: string): void {
  if (result.exitCode === 0) {
    return;
  }

  const detail = result.stderr.trim() || result.stdout.trim() || 'Unknown icm error';
  throw new Error(`${action} failed: ${detail}`);
}

function writeSummary(stdout: Writer, result: MemoirRefreshResult): void {
  stdout.write(`Memoir refresh for ${result.memoirName}\n`);
  stdout.write(`Project: ${result.projectDir}\n`);
  if (result.dryRun) {
    stdout.write('Mode: dry run\n');
  }
  stdout.write(`Created memoir: ${result.createdMemoir ? 'yes' : 'no'}\n`);
  stdout.write(`Concepts added: ${result.conceptsAdded}\n`);
  stdout.write(`Concepts refined: ${result.conceptsRefined}\n`);
  stdout.write(`Concepts unchanged: ${result.conceptsSkipped}\n`);
  stdout.write(`Links added: ${result.linksAdded}\n`);
  stdout.write(`Links unchanged: ${result.linksSkipped}\n`);
  stdout.write(`Total concepts: ${result.totalConcepts}\n`);
  stdout.write(`Total links: ${result.totalLinks}\n`);
  if (result.labelMismatches.length > 0) {
    stdout.write(
      `Label mismatches (manual review needed, refine cannot change labels): ${result.labelMismatches.join(', ')}\n`
    );
  }
}

function createBaseResult(
  memoirName: string,
  projectDir: string,
  dryRun: boolean
): MemoirRefreshResult {
  return {
    memoirName,
    projectDir,
    createdMemoir: false,
    dryRun,
    conceptsAdded: 0,
    conceptsRefined: 0,
    conceptsSkipped: 0,
    linksAdded: 0,
    linksSkipped: 0,
    labelMismatches: [],
    totalConcepts: 0,
    totalLinks: 0,
  };
}

export async function runMemoirRefreshWithOptions(
  options: MemoirRefreshOptions = {}
): Promise<MemoirRefreshResult> {
  const stdout = options.stdout ?? process.stdout;
  const projectDir = findProjectDir(options.projectDir ?? process.cwd());
  const dryRun = options.dryRun ?? false;
  const exec = options.exec ?? defaultIcmExecutor;

  if (!projectDir) {
    throw new Error(
      'Could not find a project root. Run this command inside a repository or pass --project <path>.'
    );
  }

  const profile = buildProfile(projectDir, options.memoirName);
  const result = createBaseResult(profile.memoirName, projectDir, dryRun);
  let existingGraph: ExportedMemoirGraph = { concepts: [], links: [] };

  const exportResult = exec(
    ['memoir', 'export', '--memoir', profile.memoirName, '--format', 'json'],
    projectDir
  );
  if (exportResult.exitCode !== 0) {
    if (!isMissingMemoirError(exportResult.stderr)) {
      ensureSuccess(exportResult, `export memoir ${profile.memoirName}`);
    }

    result.createdMemoir = true;
    if (!dryRun) {
      const createResult = exec(
        ['memoir', 'create', '--name', profile.memoirName, '--description', profile.description],
        projectDir
      );
      ensureSuccess(createResult, `create memoir ${profile.memoirName}`);
    }
  } else {
    existingGraph = parseExportedGraph(exportResult.stdout);
  }

  const existingConcepts = new Map(
    (existingGraph.concepts ?? []).map((concept) => [concept.name, concept])
  );
  const existingLinks = new Set(
    (existingGraph.links ?? []).map((link) => linkKey(link.source, link.relation, link.target))
  );

  for (const concept of profile.concepts) {
    const existing = existingConcepts.get(concept.name);
    if (!existing) {
      result.conceptsAdded += 1;
      if (!dryRun) {
        ensureSuccess(
          exec(
            [
              'memoir',
              'add-concept',
              '--memoir',
              profile.memoirName,
              '--name',
              concept.name,
              '--definition',
              concept.definition,
              '--labels',
              concept.labels.join(','),
            ],
            projectDir
          ),
          `add concept ${concept.name}`
        );
      }
      continue;
    }

    const existingLabels = normalizeLabels(existing.labels ?? []);
    const desiredLabels = normalizeLabels(concept.labels);
    if (existingLabels.join(',') !== desiredLabels.join(',')) {
      result.labelMismatches.push(concept.name);
    }

    if (existing.definition !== concept.definition) {
      result.conceptsRefined += 1;
      if (!dryRun) {
        ensureSuccess(
          exec(
            [
              'memoir',
              'refine',
              '--memoir',
              profile.memoirName,
              '--name',
              concept.name,
              '--definition',
              concept.definition,
            ],
            projectDir
          ),
          `refine concept ${concept.name}`
        );
      }
    } else {
      result.conceptsSkipped += 1;
    }
  }

  for (const link of profile.links) {
    const key = linkKey(link.from, link.relation, link.to);
    if (existingLinks.has(key)) {
      result.linksSkipped += 1;
      continue;
    }

    result.linksAdded += 1;
    if (!dryRun) {
      ensureSuccess(
        exec(
          [
            'memoir',
            'link',
            '--memoir',
            profile.memoirName,
            '--from',
            link.from,
            '--to',
            link.to,
            '--relation',
            link.relation,
          ],
          projectDir
        ),
        `link ${link.from} -> ${link.to}`
      );
    }
  }

  if (dryRun) {
    result.totalConcepts = (existingGraph.concepts ?? []).length + result.conceptsAdded;
    result.totalLinks = (existingGraph.links ?? []).length + result.linksAdded;
    writeSummary(stdout, result);
    return result;
  }

  const finalExportResult = exec(
    ['memoir', 'export', '--memoir', profile.memoirName, '--format', 'json'],
    projectDir
  );
  ensureSuccess(finalExportResult, `export memoir ${profile.memoirName}`);
  const finalGraph = parseExportedGraph(finalExportResult.stdout);
  result.totalConcepts = (finalGraph.concepts ?? []).length;
  result.totalLinks = (finalGraph.links ?? []).length;
  writeSummary(stdout, result);
  return result;
}

export async function runMemoirRefresh(): Promise<void> {
  const stderr = process.stderr;
  const cliArgs = parseMemoirCliArgs(process.argv.slice(2));

  try {
    await runMemoirRefreshWithOptions({
      projectDir: cliArgs.project,
      memoirName: cliArgs.memoirName,
      dryRun: cliArgs.dryRun,
    });
    process.exitCode = 0;
  } catch (error: unknown) {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
