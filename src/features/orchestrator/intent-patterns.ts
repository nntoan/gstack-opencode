import type { AgentRole, SprintPhase } from '../../types/agent.ts';

export const PHASE_PATTERNS: Map<SprintPhase, RegExp[]> = new Map([
  ['think', [/brainstorm/i, /idea/i, /what.?if/i, /office.?hours/i, /product/i]],
  ['plan', [/\bplan\b/i, /architect/i, /design/i, /review.?plan/i, /eng.?review/i, /ceo.?review/i]],
  ['build', [/implement/i, /\bbuild\b/i, /\bcode\b/i, /\bcreate\b/i, /add.?feature/i]],
  ['review', [/\breview\b/i, /\bcheck\b/i, /\baudit\b/i, /second.?opinion/i, /\bcodex\b/i]],
  ['test', [/\btest\b/i, /\bqa\b/i, /\bbrowse\b/i, /benchmark/i, /\bverify\b/i, /\bbug\b/i]],
  ['ship', [/\bship\b/i, /\bdeploy\b/i, /\brelease\b/i, /\bland\b/i, /\bmerge\b/i, /\bpr\b/i]],
  ['reflect', [/\bretro\b/i, /retrospective/i, /\bstats\b/i, /how.?did.?we.?do/i]],
  ['cross-cutting', [/\bcareful\b/i, /\bfreeze\b/i, /\bguard\b/i, /\bunfreeze\b/i]],
  ['utility', [/\bupgrade\b/i, /setup.?browser/i, /cookies/i]],
]);

export const SKILL_TO_PHASE_MAP: Readonly<Record<string, SprintPhase>> = {
  'office-hours': 'think',
  'plan-ceo-review': 'think',
  'plan-eng-review': 'plan',
  'plan-design-review': 'plan',
  review: 'review',
  'design-consultation': 'plan',
  codex: 'review',
  careful: 'cross-cutting',
  freeze: 'cross-cutting',
  guard: 'cross-cutting',
  unfreeze: 'cross-cutting',
  investigate: 'build',
  retro: 'reflect',
  ship: 'ship',
  'land-and-deploy': 'ship',
  'setup-deploy': 'ship',
  'document-release': 'ship',
  browse: 'test',
  qa: 'test',
  'qa-only': 'test',
  'design-review': 'plan',
  benchmark: 'test',
  canary: 'ship',
  'setup-browser-cookies': 'utility',
  upgrade: 'utility',
};

export const PHASE_TO_DEFAULT_AGENT: Readonly<Record<SprintPhase, AgentRole>> = {
  think: 'ceo',
  plan: 'eng-manager',
  build: 'builder',
  review: 'reviewer',
  test: 'qa-lead',
  ship: 'release-engineer',
  reflect: 'retro-lead',
  'cross-cutting': 'safety-guard',
  utility: 'upgrader',
};
