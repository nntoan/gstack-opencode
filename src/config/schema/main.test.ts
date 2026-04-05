import { describe, it, expect } from 'bun:test';
import { GstackConfigSchema } from './main.ts';

describe('GstackConfigSchema', () => {
  describe('#empty config', () => {
    it('provides correct defaults for empty config', () => {
      const result = GstackConfigSchema.parse({});

      expect(result.orchestration_mode).toBe('multi-agent');
      expect(result.disabled_skills).toHaveLength(0);
      expect(result.disabled_agents).toHaveLength(0);
      expect(result.disabled_categories).toHaveLength(0);
      expect(result.disabled_mcps).toHaveLength(0);
      expect(result.disabled_hooks).toHaveLength(0);
      expect(result.backlog.enabled).toBe(true);
      expect(result.backlog.auto_create_tasks).toBe(true);
      expect(result.backlog.auto_update_status).toBe(true);
      expect(result.agents).toBeUndefined();
      expect(result.mcp).toBeUndefined();
      expect(result.browser).toBeUndefined();
      expect(result.telemetry).toBeUndefined();
      expect(result.install_selection).toBeUndefined();
    });
  });

  describe('#install selection', () => {
    it('accepts install selection config', () => {
      const result = GstackConfigSchema.parse({
        install_selection: {
          claude_plan: 'max',
          has_openai: true,
          has_gemini: false,
          has_copilot: true,
          has_opencode_zen: false,
          has_zai_coding_plan: true,
          has_kimi_for_coding: false,
          has_opencode_go: true,
        },
      });

      expect(result.install_selection?.claude_plan).toBe('max');
      expect(result.install_selection?.has_openai).toBe(true);
      expect(result.install_selection?.has_zai_coding_plan).toBe(true);
    });

    it('rejects invalid claude plan values', () => {
      expect(() =>
        GstackConfigSchema.parse({
          install_selection: {
            claude_plan: 'enterprise',
          },
        })
      ).toThrow();
    });
  });

  describe('#orchestration_mode', () => {
    it('accepts valid modes', () => {
      const multiAgent = GstackConfigSchema.parse({
        orchestration_mode: 'multi-agent',
      });
      expect(multiAgent.orchestration_mode).toBe('multi-agent');

      const skillsOnly = GstackConfigSchema.parse({
        orchestration_mode: 'skills-only',
      });
      expect(skillsOnly.orchestration_mode).toBe('skills-only');
    });

    it('rejects invalid orchestration_mode', () => {
      expect(() => GstackConfigSchema.parse({ orchestration_mode: 'invalid' })).toThrow();
    });
  });

  describe('#disabled arrays', () => {
    it('accepts empty disabled arrays', () => {
      const result = GstackConfigSchema.parse({
        disabled_skills: [],
        disabled_agents: [],
        disabled_categories: [],
        disabled_mcps: [],
        disabled_hooks: [],
      });

      expect(result.disabled_skills).toHaveLength(0);
      expect(result.disabled_agents).toHaveLength(0);
      expect(result.disabled_categories).toHaveLength(0);
      expect(result.disabled_mcps).toHaveLength(0);
      expect(result.disabled_hooks).toHaveLength(0);
    });

    it('accepts non-empty disabled arrays', () => {
      const result = GstackConfigSchema.parse({
        disabled_skills: ['skill1', 'skill2'],
        disabled_agents: ['agent1'],
        disabled_categories: ['category1'],
        disabled_mcps: ['websearch'],
        disabled_hooks: ['hook1'],
      });

      expect(result.disabled_skills).toEqual(['skill1', 'skill2']);
      expect(result.disabled_agents).toEqual(['agent1']);
      expect(result.disabled_categories).toEqual(['category1']);
      expect(result.disabled_mcps).toEqual(['websearch']);
      expect(result.disabled_hooks).toEqual(['hook1']);
    });
  });

  describe('#agent overrides', () => {
    it('accepts agent overrides', () => {
      const result = GstackConfigSchema.parse({
        agents: {
          sisyphus: {
            model: 'claude-opus',
            instructions: 'Custom instructions',
            enabled: false,
          },
        },
      });

      expect(result.agents?.sisyphus).toBeDefined();
      expect(result.agents?.sisyphus.model).toBe('claude-opus');
      expect(result.agents?.sisyphus.instructions).toBe('Custom instructions');
      expect(result.agents?.sisyphus.enabled).toBe(false);
    });

    it('allows partial agent overrides', () => {
      const result = GstackConfigSchema.parse({
        agents: {
          sisyphus: {
            model: 'gpt-4',
          },
        },
      });

      expect(result.agents?.sisyphus.model).toBe('gpt-4');
      expect(result.agents?.sisyphus.instructions).toBeUndefined();
      expect(result.agents?.sisyphus.enabled).toBeUndefined();
    });
  });

  describe('#backlog config', () => {
    it('applies backlog defaults', () => {
      const result = GstackConfigSchema.parse({
        backlog: {},
      });

      expect(result.backlog.enabled).toBe(true);
      expect(result.backlog.auto_create_tasks).toBe(true);
      expect(result.backlog.auto_update_status).toBe(true);
    });

    it('accepts custom backlog config', () => {
      const result = GstackConfigSchema.parse({
        backlog: {
          enabled: false,
          auto_create_tasks: false,
          auto_update_status: true,
        },
      });

      expect(result.backlog.enabled).toBe(false);
      expect(result.backlog.auto_create_tasks).toBe(false);
      expect(result.backlog.auto_update_status).toBe(true);
    });
  });

  describe('#mcp config', () => {
    it('accepts MCP overrides', () => {
      const result = GstackConfigSchema.parse({
        mcp: {
          websearch: {
            provider: 'tavily',
            api_key: 'test-key',
            enabled: false,
          },
        },
      });

      expect(result.mcp?.websearch).toBeDefined();
      expect(result.mcp?.websearch?.provider).toBe('tavily');
      expect(result.mcp?.websearch?.api_key).toBe('test-key');
      expect(result.mcp?.websearch?.enabled).toBe(false);
    });

    it('applies websearch MCP defaults', () => {
      const result = GstackConfigSchema.parse({
        mcp: {
          websearch: {},
        },
      });

      expect(result.mcp?.websearch?.provider).toBe('exa');
      expect(result.mcp?.websearch?.enabled).toBe(true);
    });

    it('applies context7 MCP defaults', () => {
      const result = GstackConfigSchema.parse({
        mcp: {
          context7: {},
        },
      });

      expect(result.mcp?.context7?.enabled).toBe(true);
    });

    it('rejects invalid websearch provider', () => {
      expect(() =>
        GstackConfigSchema.parse({
          mcp: {
            websearch: {
              provider: 'invalid',
            },
          },
        })
      ).toThrow();
    });
  });

  describe('#agent_registration config', () => {
    it('applies defaults for agent registration', () => {
      const result = GstackConfigSchema.parse({});
      expect(result.agent_registration?.mode).toBe('curated');
      expect(result.agent_registration?.suppress_host_builtins).toEqual(['build', 'plan']);
    });

    it('accepts curated and replace registration modes', () => {
      const curated = GstackConfigSchema.parse({
        agent_registration: {
          mode: 'curated',
          suppress_host_builtins: ['build', 'plan', 'title'],
        },
      });
      expect(curated.agent_registration?.mode).toBe('curated');
      expect(curated.agent_registration?.suppress_host_builtins).toContain('title');

      const replace = GstackConfigSchema.parse({
        agent_registration: {
          mode: 'replace',
          suppress_host_builtins: ['build', 'plan'],
        },
      });
      expect(replace.agent_registration?.mode).toBe('replace');
    });
  });

  describe('#categories and runtime fallback', () => {
    it('accepts categories object', () => {
      const result = GstackConfigSchema.parse({
        categories: {
          quick: { model: 'opencode/gpt-5-nano', textVerbosity: 'low' },
          deep: { model: 'openai/gpt-5.3-codex' },
        },
      });
      expect(result.categories?.quick).toBeDefined();
      expect((result.categories?.quick as Record<string, unknown>).model).toBe(
        'opencode/gpt-5-nano'
      );
    });

    it('accepts runtime_fallback as boolean and object', () => {
      const boolResult = GstackConfigSchema.parse({ runtime_fallback: true });
      expect(boolResult.runtime_fallback).toBe(true);

      const objectResult = GstackConfigSchema.parse({
        runtime_fallback: {
          enabled: true,
          max_fallback_attempts: 3,
        },
      });
      expect((objectResult.runtime_fallback as Record<string, unknown>).enabled).toBe(true);
    });
  });

  describe('#browser config', () => {
    it('accepts browser config', () => {
      const result = GstackConfigSchema.parse({
        browser: {
          headless: false,
          timeout_ms: 60000,
        },
      });

      expect(result.browser?.headless).toBe(false);
      expect(result.browser?.timeout_ms).toBe(60000);
    });

    it('applies browser defaults', () => {
      const result = GstackConfigSchema.parse({
        browser: {},
      });

      expect(result.browser?.headless).toBe(true);
      expect(result.browser?.timeout_ms).toBe(30000);
    });
  });

  describe('#telemetry config', () => {
    it('accepts telemetry config', () => {
      const result = GstackConfigSchema.parse({
        telemetry: {
          enabled: false,
          supabase: {
            url: 'https://example.supabase.co',
            key: 'test-key',
          },
        },
      });

      expect(result.telemetry?.enabled).toBe(false);
      expect(result.telemetry?.supabase?.url).toBe('https://example.supabase.co');
      expect(result.telemetry?.supabase?.key).toBe('test-key');
    });

    it('applies telemetry defaults', () => {
      const result = GstackConfigSchema.parse({
        telemetry: {},
      });

      expect(result.telemetry?.enabled).toBe(true);
    });
  });

  describe('#full config', () => {
    it('accepts full complex config', () => {
      const result = GstackConfigSchema.parse({
        orchestration_mode: 'skills-only',
        disabled_skills: ['playwright'],
        disabled_agents: ['sisyphus'],
        disabled_categories: ['ultrabrain'],
        disabled_mcps: ['websearch'],
        disabled_hooks: ['before-tool'],
        agents: {
          sisyphus: {
            model: 'gpt-4',
            enabled: false,
          },
        },
        mcp: {
          websearch: {
            provider: 'tavily',
            enabled: true,
          },
          context7: {
            api_key: 'secret',
            enabled: true,
          },
        },
        categories: {
          quick: {
            model: 'opencode/gpt-5-nano',
          },
        },
        runtime_fallback: {
          enabled: true,
        },
        agent_registration: {
          mode: 'curated',
          suppress_host_builtins: ['build', 'plan'],
        },
        backlog: {
          enabled: true,
          auto_create_tasks: false,
        },
        browser: {
          headless: false,
          timeout_ms: 45000,
        },
        telemetry: {
          enabled: true,
          supabase: {
            url: 'https://test.supabase.co',
          },
        },
      });

      expect(result.orchestration_mode).toBe('skills-only');
      expect(result.disabled_skills).toContain('playwright');
      expect(result.disabled_agents).toContain('sisyphus');
      expect(result.disabled_categories).toContain('ultrabrain');
      expect(result.agents?.sisyphus.model).toBe('gpt-4');
      expect(result.agent_registration?.mode).toBe('curated');
      expect(result.categories?.quick).toBeDefined();
      expect((result.runtime_fallback as Record<string, unknown>).enabled).toBe(true);
      expect(result.backlog.auto_create_tasks).toBe(false);
      expect(result.browser?.headless).toBe(false);
      expect(result.telemetry?.supabase?.url).toBe('https://test.supabase.co');
    });
  });

  describe('#type exports', () => {
    it('correctly exports GstackConfigOutput type', () => {
      const config = GstackConfigSchema.parse({});
      const _: typeof config = config;
      expect(_).toBeDefined();
    });
  });
});
