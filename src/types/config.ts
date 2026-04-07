export type OrchestrationMode = 'multi-agent' | 'skills-only';

export type PresetMode = 'full' | 'slim';

export type AgentSurfaceMode = 'company' | 'legacy-multi';

export interface AgentSurfaceConfig {
  mode: AgentSurfaceMode;
}

export interface TokenBudgetConfig {
  enabled: boolean;
  max_tokens_per_session: number;
  warn_at_percent: number;
}

export type AgentRegistrationMode = 'augment' | 'curated' | 'replace';

export interface BacklogConfig {
  enabled: boolean;
  auto_create_tasks: boolean;
  auto_update_status: boolean;
}

export interface AgentOverrideConfig {
  model?: string;
  reasoning_effort?: 'low' | 'medium' | 'high';
  instructions?: string;
  enabled?: boolean;
}

export interface AgentRegistrationConfig {
  mode: AgentRegistrationMode;
  suppress_host_builtins: string[];
}

export type CategoryOverrideConfig = unknown;

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

export interface WebsearchMcpOverride {
  provider?: 'exa' | 'tavily';
  api_key?: string;
  enabled?: boolean;
}

export interface Context7McpOverride {
  api_key?: string;
  enabled?: boolean;
}

export interface McpProviderConfig {
  websearch?: WebsearchMcpOverride;
  context7?: Context7McpOverride;
  contexthub?: McpOverrideConfig;
  grep_app?: McpOverrideConfig;
  backlog_md?: McpOverrideConfig;
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

export type RuntimeFallbackConfig = boolean | Record<string, unknown>;

export interface GstackConfig {
  orchestration_mode: OrchestrationMode;
  preset?: PresetMode;
  disabled_skills: string[];
  disabled_agents: string[];
  disabled_categories: string[];
  disabled_mcps: string[];
  disabled_hooks: string[];
  install_selection?: InstallSelectionConfig;
  agent_registration?: AgentRegistrationConfig;
  agent_surface?: AgentSurfaceConfig;
  agents?: Record<string, AgentOverrideConfig>;
  categories?: Record<string, CategoryOverrideConfig>;
  runtime_fallback?: RuntimeFallbackConfig;
  mcp?: McpProviderConfig;
  backlog: BacklogConfig;
  browser?: BrowserConfig;
  telemetry?: TelemetryConfig;
  token_budget?: TokenBudgetConfig;
}
