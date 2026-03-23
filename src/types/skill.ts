export interface BuiltinSkill {
  name: string;
  description: string;
  template: string;
  allowedTools?: string[];
  mcpConfig?: Record<string, unknown>;
  agent?: string;
  model?: string;
  subtask?: boolean;
  argumentHint?: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
}

export type SkillGroup = 'planning' | 'review' | 'safety' | 'utility' | 'deploy' | 'browser';

export interface GstackSkill extends BuiltinSkill {
  group: SkillGroup;
  originalSkillName: string;
  browserRequired: boolean;
}
