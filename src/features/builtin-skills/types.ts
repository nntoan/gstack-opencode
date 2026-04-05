import type { PresetMode } from '../../types/config.ts';

export interface CreateBuiltinSkillsOptions {
  disabledSkills?: Set<string>;
  browserAvailable?: boolean;
  preset?: PresetMode;
}
