import type { GstackSkill } from '../../types/skill.ts';
import type { CreateBuiltinSkillsOptions } from './types.ts';
import { officeHoursSkill } from './skills/office-hours.ts';
import { planCeoReviewSkill } from './skills/plan-ceo-review.ts';
import { planEngReviewSkill } from './skills/plan-eng-review.ts';
import { planDesignReviewSkill } from './skills/plan-design-review.ts';
import { reviewSkill } from './skills/review.ts';
import { designConsultationSkill } from './skills/design-consultation.ts';
import { codexSkill } from './skills/codex.ts';
import { carefulSkill } from './skills/careful.ts';
import { freezeSkill } from './skills/freeze.ts';
import { guardSkill } from './skills/guard.ts';
import { unfreezeSkill } from './skills/unfreeze.ts';
import { investigateSkill } from './skills/investigate.ts';
import { retroSkill } from './skills/retro.ts';
import { shipSkill } from './skills/ship.ts';
import { landAndDeploySkill } from './skills/land-and-deploy.ts';
import { setupDeploySkill } from './skills/setup-deploy.ts';
import { documentReleaseSkill } from './skills/document-release.ts';
import { browseSkill } from './skills/browse.ts';
import { qaSkill } from './skills/qa.ts';
import { qaOnlySkill } from './skills/qa-only.ts';
import { designReviewSkill } from './skills/design-review.ts';
import { benchmarkSkill } from './skills/benchmark.ts';
import { canarySkill } from './skills/canary.ts';
import { setupBrowserCookiesSkill } from './skills/setup-browser-cookies.ts';
import { upgradeSkill } from './skills/upgrade.ts';

const ALL_SKILLS: GstackSkill[] = [
  officeHoursSkill,
  planCeoReviewSkill,
  planEngReviewSkill,
  planDesignReviewSkill,
  reviewSkill,
  designConsultationSkill,
  codexSkill,
  carefulSkill,
  freezeSkill,
  guardSkill,
  unfreezeSkill,
  investigateSkill,
  retroSkill,
  shipSkill,
  landAndDeploySkill,
  setupDeploySkill,
  documentReleaseSkill,
  browseSkill,
  qaSkill,
  qaOnlySkill,
  designReviewSkill,
  benchmarkSkill,
  canarySkill,
  setupBrowserCookiesSkill,
  upgradeSkill,
];

export function createBuiltinSkills(options: CreateBuiltinSkillsOptions = {}): GstackSkill[] {
  const { disabledSkills = new Set(), browserAvailable = true } = options;
  return ALL_SKILLS.filter((skill) => {
    if (disabledSkills.has(skill.name)) return false;
    if (!browserAvailable && skill.browserRequired) return false;
    return true;
  });
}
