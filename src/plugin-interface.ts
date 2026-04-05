import type { GstackConfig } from './types/config.ts';
import type { GstackSkill } from './types/skill.ts';
import type { GstackAgent } from './types/agent.ts';
import type { Managers } from './create-managers.ts';
import type { Orchestrator } from './features/orchestrator/index.ts';
import type { HookRegistry } from './types/hooks.ts';
import {
  DelegationStateManager,
  buildDelegationSystemPrompt,
} from './features/orchestrator/index.ts';
import { log } from './shared/index.ts';

export type PluginInterfaceParams = {
  ctx: { directory: string };
  pluginConfig: GstackConfig;
  managers: Managers;
  hooks: HookRegistry;
  tools: Record<string, unknown>;
  orchestrator: Orchestrator;
  delegationState: DelegationStateManager;
  skills: GstackSkill[];
  agents: GstackAgent[];
};

export function createPluginInterface(params: PluginInterfaceParams): Record<string, unknown> {
  const { managers, tools, orchestrator, pluginConfig, delegationState, hooks } = params;

  return {
    tool: tools,

    config: managers.configHandler,

    'chat.params': async (): Promise<void> => {},

    'chat.headers': async (): Promise<void> => {},

    'chat.message': async (
      input:
        | {
            sessionID?: string;
            agent?: string;
            model?: { providerID: string; modelID: string };
            messageID?: string;
            variant?: string;
          }
        | undefined,
      output: { message: unknown; parts: unknown[] } | undefined
    ): Promise<void> => {
      const parts = output?.parts ?? [];
      await hooks.dispatch(
        'chat.message',
        { sessionID: input?.sessionID ?? '', text: '' },
        { parts }
      );

      if (pluginConfig.orchestration_mode !== 'multi-agent') return;

      const text =
        parts
          .filter((p: unknown) => (p as { type?: string }).type === 'text')
          .map(
            (p: unknown) =>
              (p as { text?: string; value?: string }).text ||
              (p as { text?: string; value?: string }).value ||
              ''
          )
          .join(' ') || '';

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

    'experimental.chat.system.transform': async (
      input: { sessionID?: string; model?: unknown } | undefined,
      output: { system: string[] } | undefined
    ): Promise<void> => {
      const safeOutput: { system: string[] } = output ?? { system: [] };
      if (!Array.isArray(safeOutput.system)) safeOutput.system = [];

      await hooks.dispatch('system.transform', { sessionID: input?.sessionID ?? '' }, safeOutput);

      const sessionId = input?.sessionID ?? '';
      if (!sessionId) return;

      const delegation = delegationState.getDelegation(sessionId);
      if (!delegation) return;

      const contextPrompt = buildDelegationSystemPrompt(delegation);
      safeOutput.system.push(contextPrompt);
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

    'tool.execute.before': async (
      input: { tool: string; sessionID: string; callID: string } | undefined,
      output: { args: unknown } | undefined
    ): Promise<void> => {
      if (!input) return;
      await hooks.dispatch('tool.execute.before', input, output ?? { args: {} });
    },

    'tool.execute.after': async (
      input: { tool: string; sessionID: string; callID: string; args: unknown } | undefined,
      output: { title: string; output: string; metadata: unknown } | undefined
    ): Promise<void> => {
      if (!input) return;
      await hooks.dispatch(
        'tool.execute.after',
        input,
        output ?? { title: '', output: '', metadata: null }
      );
    },

    'tool.definition': async (): Promise<void> => {},
  };
}
