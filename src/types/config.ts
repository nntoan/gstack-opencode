export type OrchestrationMode = 'multi-agent' | 'skills-only';

export interface BacklogConfig {
  enabled: boolean;
  auto_create_tasks: boolean;
  auto_update_status: boolean;
}

export interface AgentOverrideConfig {
  model?: string;
  instructions?: string;
  enabled?: boolean;
}

export interface McpOverrideConfig {
  enabled?: boolean;
  url?: string;
  api_key?: string;
}

export interface BrowserConfig {
  headless: boolean;
  timeout_ms: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  supabase?: {
    url?: string;
    key?: string;
  };
}

export interface GstackConfig {
  orchestration_mode: OrchestrationMode;
  disabled_skills: string[];
  disabled_agents: string[];
  disabled_mcps: string[];
  disabled_hooks: string[];
  agents?: Record<string, AgentOverrideConfig>;
  mcp?: Record<string, McpOverrideConfig>;
  backlog: BacklogConfig;
  browser?: BrowserConfig;
  telemetry?: TelemetryConfig;
}
