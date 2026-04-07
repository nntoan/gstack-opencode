import type { AgentRole } from '../types/agent.ts';

export type ProviderKey =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'github-copilot'
  | 'opencode'
  | 'zai-coding-plan'
  | 'kimi-for-coding'
  | 'opencode-go';

export interface FallbackEntry {
  providers: ProviderKey[];
  model: string;
  variant?: string;
}

const PROMETHEUS_CHAIN: FallbackEntry[] = [
  {
    providers: ['anthropic', 'github-copilot', 'opencode'],
    model: 'claude-opus-4-6',
    variant: 'max',
  },
  {
    providers: ['openai', 'github-copilot', 'opencode'],
    model: 'gpt-5.4',
    variant: 'high',
  },
  { providers: ['opencode-go'], model: 'glm-5' },
  { providers: ['google', 'github-copilot', 'opencode'], model: 'gemini-3.1-pro' },
];

const METIS_CHAIN: FallbackEntry[] = [
  {
    providers: ['anthropic', 'github-copilot', 'opencode'],
    model: 'claude-opus-4-6',
    variant: 'max',
  },
  {
    providers: ['openai', 'github-copilot', 'opencode'],
    model: 'gpt-5.4',
    variant: 'high',
  },
  { providers: ['opencode-go'], model: 'glm-5' },
  { providers: ['kimi-for-coding'], model: 'k2p5' },
];

const ORACLE_CHAIN: FallbackEntry[] = [
  { providers: ['openai', 'github-copilot', 'opencode'], model: 'gpt-5.4', variant: 'high' },
  { providers: ['google', 'github-copilot', 'opencode'], model: 'gemini-3.1-pro', variant: 'high' },
  {
    providers: ['anthropic', 'github-copilot', 'opencode'],
    model: 'claude-opus-4-6',
    variant: 'max',
  },
  { providers: ['opencode-go'], model: 'glm-5' },
];

const HEPHAESTUS_CHAIN: FallbackEntry[] = [
  {
    providers: ['openai', 'github-copilot', 'opencode'],
    model: 'gpt-5.4',
    variant: 'medium',
  },
];

const SISYPHUS_JUNIOR_CHAIN: FallbackEntry[] = [
  { providers: ['anthropic', 'github-copilot', 'opencode'], model: 'claude-sonnet-4-6' },
  { providers: ['opencode-go'], model: 'kimi-k2.5' },
  {
    providers: ['openai', 'github-copilot', 'opencode'],
    model: 'gpt-5.4',
    variant: 'medium',
  },
  { providers: ['opencode-go'], model: 'minimax-m2.7' },
  { providers: ['opencode'], model: 'big-pickle' },
];

const ATLAS_CHAIN: FallbackEntry[] = [
  { providers: ['anthropic', 'github-copilot', 'opencode'], model: 'claude-sonnet-4-6' },
  { providers: ['opencode-go'], model: 'kimi-k2.5' },
  {
    providers: ['openai', 'github-copilot', 'opencode'],
    model: 'gpt-5.4',
    variant: 'medium',
  },
  { providers: ['opencode-go'], model: 'minimax-m2.7' },
];

const EXPLORE_CHAIN: FallbackEntry[] = [
  { providers: ['github-copilot'], model: 'grok-code-fast-1' },
  { providers: ['opencode-go'], model: 'minimax-m2.7-highspeed' },
  { providers: ['opencode'], model: 'minimax-m2.7' },
  { providers: ['anthropic', 'opencode'], model: 'claude-haiku-4-5' },
  { providers: ['opencode'], model: 'gpt-5-nano' },
];

const WRITING_CHAIN: FallbackEntry[] = [
  { providers: ['google', 'github-copilot', 'opencode'], model: 'gemini-3-flash' },
  { providers: ['opencode-go'], model: 'kimi-k2.5' },
  { providers: ['anthropic', 'github-copilot', 'opencode'], model: 'claude-sonnet-4-6' },
  { providers: ['opencode-go'], model: 'minimax-m2.7' },
];

const VISUAL_ENGINEERING_CHAIN: FallbackEntry[] = [
  { providers: ['google', 'github-copilot', 'opencode'], model: 'gemini-3.1-pro', variant: 'high' },
  { providers: ['zai-coding-plan', 'opencode'], model: 'glm-5' },
  {
    providers: ['anthropic', 'github-copilot', 'opencode'],
    model: 'claude-opus-4-6',
    variant: 'max',
  },
  { providers: ['opencode-go'], model: 'glm-5' },
  { providers: ['kimi-for-coding'], model: 'k2p5' },
];

const COMPANY_CHAIN: FallbackEntry[] = [
  {
    providers: ['github-copilot', 'openai', 'opencode'],
    model: 'gpt-5.4',
    variant: 'medium',
  },
  {
    providers: ['anthropic', 'opencode'],
    model: 'claude-opus-4-6',
    variant: 'medium',
  },
];

export const ROLE_FALLBACKS: Record<AgentRole, FallbackEntry[]> = {
  ceo: PROMETHEUS_CHAIN,
  'eng-manager': METIS_CHAIN,
  designer: VISUAL_ENGINEERING_CHAIN,
  builder: SISYPHUS_JUNIOR_CHAIN,
  reviewer: ORACLE_CHAIN,
  debugger: HEPHAESTUS_CHAIN,
  'qa-lead': ATLAS_CHAIN,
  'release-engineer': ATLAS_CHAIN,
  'doc-engineer': WRITING_CHAIN,
  'retro-lead': WRITING_CHAIN,
  'safety-guard': ORACLE_CHAIN,
  upgrader: HEPHAESTUS_CHAIN,
  'session-manager': EXPLORE_CHAIN,
  company: COMPANY_CHAIN,
};
