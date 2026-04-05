import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent } from './types/agent.ts';
import type { McpToolInvoker } from './features/skill-mcp-manager/index.ts';
import { SkillMcpManager } from './features/skill-mcp-manager/index.ts';
import { createConfigHandler } from './plugin-handlers/index.ts';
import { createSprintBacklog } from './features/sprint-backlog/index.ts';
import type { SprintBacklog } from './features/sprint-backlog/index.ts';
import { createWorkspaceState } from './features/workspace-state/index.ts';
import { createAnalytics } from './features/analytics/index.ts';
import type { Analytics } from './features/analytics/index.ts';
import { getAnalyticsDir } from './shared/path-helpers.ts';

export class DeferredMcpInvoker implements McpToolInvoker {
  private delegate: McpToolInvoker | null = null;

  connect(invoker: McpToolInvoker): void {
    this.delegate = invoker;
  }

  get isConnected(): boolean {
    return this.delegate !== null;
  }

  async invoke(
    serverName: string,
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.delegate) {
      throw new Error(
        `[gstack] MCP invoke not yet connected: ${serverName}/${toolName}. ` +
          'The MCP connection will be established when the host provides it.'
      );
    }
    return this.delegate.invoke(serverName, toolName, args ?? {});
  }
}

export interface Managers {
  skillMcpManager: SkillMcpManager;
  configHandler: ReturnType<typeof createConfigHandler>;
  sprintBacklog: SprintBacklog;
  mcpInvoker: DeferredMcpInvoker;
  workspaceState: ReturnType<typeof createWorkspaceState>;
  analytics: Analytics;
}

export function createManagers(params: {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  skills?: GstackSkill[];
  agents?: GstackAgent[];
}): Managers {
  const { ctx: _ctx, pluginConfig, skills, agents } = params;

  const skillMcpManager = new SkillMcpManager();
  const configHandler = createConfigHandler({ ctx: _ctx, pluginConfig, skills, agents });
  const mcpInvoker = new DeferredMcpInvoker();
  const sprintBacklog = createSprintBacklog(mcpInvoker);
  const workspaceState = createWorkspaceState(_ctx.directory);
  const analytics = createAnalytics({
    analyticsDir: getAnalyticsDir(_ctx.directory),
    enabled: true,
  });

  return { skillMcpManager, configHandler, sprintBacklog, mcpInvoker, workspaceState, analytics };
}
