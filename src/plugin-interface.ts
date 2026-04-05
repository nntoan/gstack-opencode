import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent } from './types/agent.ts';
import type { Managers } from './create-managers.ts';
import type { Orchestrator } from './features/orchestrator/index.ts';
import {
  DelegationStateManager,
  buildDelegationSystemPrompt,
} from './features/orchestrator/index.ts';
import { log } from './shared/index.ts';

export type PluginInterfaceParams = {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
  hooks: Record<string, unknown>;
  tools: Record<string, unknown>;
  orchestrator: Orchestrator;
  delegationState: DelegationStateManager;
  skills: GstackSkill[];
  agents: GstackAgent[];
};

export function createPluginInterface(params: PluginInterfaceParams): Record<string, unknown> {
  const { managers, tools, orchestrator, pluginConfig, delegationState } = params;

  return {
    tool: tools,

    config: managers.configHandler,

    'chat.params': async (): Promise<void> => {},

    'chat.headers': async (): Promise<void> => {},

    'chat.message': async (input: { sessionID?: string; text?: string }): Promise<void> => {
      if (pluginConfig.orchestration_mode !== 'multi-agent') return;
      const text = input?.text ?? '';
      if (!text) return;
      try {
        const classified = orchestrator.classify(text);
        const result = orchestrator.delegate(classified);
        if (result) {
          const sessionId = input?.sessionID ?? '';
          if (sessionId) {
            delegationState.setDelegation(sessionId, result);
          }
          log('[plugin-interface] delegated intent', {
            phase: result.phase,
            agent: result.agent.role,
            skillCount: result.skills.length,
          });
        }
      } catch (err: unknown) {
        log('[plugin-interface] chat.message delegation error', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    'experimental.chat.messages.transform': async (): Promise<void> => {},

    'experimental.chat.system.transform': async (input: {
      sessionID?: string;
      system?: string;
    }): Promise<{ system: string } | undefined> => {
      const sessionId = input?.sessionID ?? '';
      if (!sessionId) return undefined;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return undefined;

      const contextPrompt = buildDelegationSystemPrompt(delegation);
      return {
        system: input.system ? `${input.system}\n\n${contextPrompt}` : contextPrompt,
      };
    },

    event: async (input: {
      type?: string;
      properties?: { info?: { id?: string } };
    }): Promise<void> => {
      if (input?.type === 'session.deleted') {
        const sessionID = input?.properties?.info?.id;
        if (sessionID) {
          await managers.skillMcpManager.disconnectSession(sessionID);
          delegationState.clearSession(sessionID);
          log('[plugin-interface] disconnected MCP session', { sessionID });
        }
      }
    },

    'tool.execute.before': async (): Promise<void> => {},

    'tool.execute.after': async (): Promise<void> => {},

    'tool.definition': async (): Promise<void> => {},
  };
}
