/** The curated skill set for slim mode — maximum value with minimal surface */
export const SLIM_SKILL_NAMES: ReadonlySet<string> = new Set([
  'office-hours',
  'review',
  'ship',
  'qa',
  'investigate',
]);

export function isSlimSkill(skillName: string): boolean {
  return SLIM_SKILL_NAMES.has(skillName);
}
