import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent } from './types/agent.ts';
import type { McpToolInvoker } from './features/skill-mcp-manager/index.ts';
import { SkillMcpManager } from './features/skill-mcp-manager/index.ts';
import { createConfigHandler } from './plugin-handlers/index.ts';
import { createSprintBacklog } from './features/sprint-backlog/index.ts';
import type { SprintBacklog } from './features/sprint-backlog/index.ts';

function createCtxMcpInvoker(ctx: { directory: string }): McpToolInvoker {
  return {
    async invoke(serverName: string, toolName: string): Promise<unknown> {
      throw new Error(
        `[gstack] MCP invoke unavailable at init: ${serverName}/${toolName} (dir=${ctx.directory})`
      );
    },
  };
}

export interface Managers {
  skillMcpManager: SkillMcpManager;
  configHandler: ReturnType<typeof createConfigHandler>;
  sprintBacklog: SprintBacklog;
}

export function createManagers(params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  skills?: GstackSkill[];
  agents?: GstackAgent[];
}): Managers {
  const { ctx, pluginConfig, skills, agents } = params;

  const skillMcpManager = new SkillMcpManager();
  const configHandler = createConfigHandler({ ctx, pluginConfig, skills, agents });
  const mcpInvoker = createCtxMcpInvoker(ctx);
  const sprintBacklog = createSprintBacklog(mcpInvoker);

  return { skillMcpManager, configHandler, sprintBacklog };
}
