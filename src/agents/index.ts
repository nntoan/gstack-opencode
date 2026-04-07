import type { GstackAgent, AgentRole, SprintPhase } from '../types/agent.ts';
import type { CreateAgentsOptions } from './types.ts';
import { ceoAgent } from './ceo.ts';
import { engManagerAgent } from './eng-manager.ts';
import { designerAgent } from './designer.ts';
import { builderAgent } from './builder.ts';
import { reviewerAgent } from './reviewer.ts';
import { debuggerAgent } from './debugger.ts';
import { qaLeadAgent } from './qa-lead.ts';
import { releaseEngineerAgent } from './release-engineer.ts';
import { docEngineerAgent } from './doc-engineer.ts';
import { retroLeadAgent } from './retro-lead.ts';
import { safetyGuardAgent } from './safety-guard.ts';
import { upgraderAgent } from './upgrader.ts';
import { sessionManagerAgent } from './session-manager.ts';
import { companyAgent } from './company.ts';

export type { GstackAgent, AgentRole, SprintPhase };
export type { CreateAgentsOptions };

export {
  ceoAgent,
  engManagerAgent,
  designerAgent,
  builderAgent,
  reviewerAgent,
  debuggerAgent,
  qaLeadAgent,
  releaseEngineerAgent,
  docEngineerAgent,
  retroLeadAgent,
  safetyGuardAgent,
  upgraderAgent,
  sessionManagerAgent,
  companyAgent,
};

const ALL_AGENTS: GstackAgent[] = [
  ceoAgent,
  engManagerAgent,
  designerAgent,
  builderAgent,
  reviewerAgent,
  debuggerAgent,
  qaLeadAgent,
  releaseEngineerAgent,
  docEngineerAgent,
  retroLeadAgent,
  safetyGuardAgent,
  upgraderAgent,
  sessionManagerAgent,
  companyAgent,
];

export function createGstackAgents(options: CreateAgentsOptions = {}): GstackAgent[] {
  const { disabledAgents = new Set(), orchestrationMode = 'multi-agent' } = options;

  if (orchestrationMode === 'skills-only') {
    return [];
  }

  return ALL_AGENTS.filter((agent) => !disabledAgents.has(agent.role));
}

export function getAgentByRole(role: AgentRole): GstackAgent | undefined {
  return ALL_AGENTS.find((agent) => agent.role === role);
}

export function getAgentsByPhase(phase: SprintPhase): GstackAgent[] {
  return ALL_AGENTS.filter((agent) => agent.sprintPhase === phase);
}
