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

export interface InstallSelectionConfig {
  claude_plan?: 'none' | 'pro' | 'max';
  has_openai?: boolean;
  has_gemini?: boolean;
  has_copilot?: boolean;
  has_opencode_zen?: boolean;
  has_zai_coding_plan?: boolean;
  has_kimi_for_coding?: boolean;
  has_opencode_go?: boolean;
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
  install_selection?: InstallSelectionConfig;
  agents?: Record<string, AgentOverrideConfig>;
  mcp?: Record<string, McpOverrideConfig>;
  backlog: BacklogConfig;
  browser?: BrowserConfig;
  telemetry?: TelemetryConfig;
}
