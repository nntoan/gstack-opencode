import { SCHEMA_URL } from '../src/config/schema/constants.ts';

const configSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: SCHEMA_URL,
  type: 'object',
  properties: {
    orchestration_mode: {
      type: 'string',
      enum: ['multi-agent', 'skills-only'],
      default: 'multi-agent',
      description: 'Orchestration mode for agent execution',
    },
    disabled_skills: {
      type: 'array',
      items: {
        type: 'string',
      },
      default: [],
      description: 'List of disabled skill names',
    },
    disabled_agents: {
      type: 'array',
      items: {
        type: 'string',
      },
      default: [],
      description: 'List of disabled agent names',
    },
    disabled_mcps: {
      type: 'array',
      items: {
        type: 'string',
      },
      default: [],
      description: 'List of disabled MCP names',
    },
    disabled_hooks: {
      type: 'array',
      items: {
        type: 'string',
      },
      default: [],
      description: 'List of disabled hook names',
    },
    agents: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          model: {
            type: 'string',
            description: 'Override model name for this agent',
          },
          instructions: {
            type: 'string',
            description: 'Custom instructions for this agent',
          },
          enabled: {
            type: 'boolean',
            description: 'Enable or disable this agent',
          },
        },
      },
      description: 'Per-agent configuration overrides',
    },
    mcp: {
      type: 'object',
      properties: {
        websearch: {
          type: 'object',
          properties: {
            provider: {
              type: 'string',
              enum: ['exa', 'tavily'],
              default: 'exa',
            },
            api_key: {
              type: 'string',
            },
            enabled: {
              type: 'boolean',
              default: true,
            },
          },
        },
        context7: {
          type: 'object',
          properties: {
            api_key: {
              type: 'string',
            },
            enabled: {
              type: 'boolean',
              default: true,
            },
          },
        },
        contexthub: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              default: true,
            },
          },
        },
        grep_app: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              default: true,
            },
          },
        },
        backlog_md: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              default: true,
            },
          },
        },
      },
      description: 'MCP configuration',
    },
    backlog: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
        },
        auto_create_tasks: {
          type: 'boolean',
          default: true,
        },
        auto_update_status: {
          type: 'boolean',
          default: true,
        },
      },
      default: {},
      description: 'Backlog system configuration',
    },
    browser: {
      type: 'object',
      properties: {
        headless: {
          type: 'boolean',
          default: true,
        },
        timeout_ms: {
          type: 'number',
          default: 30000,
        },
      },
      description: 'Browser automation configuration',
    },
    telemetry: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
        },
        supabase: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
            },
            key: {
              type: 'string',
            },
          },
        },
      },
      description: 'Telemetry configuration',
    },
  },
  additionalProperties: false,
};

await Bun.write('schemas/config.schema.json', JSON.stringify(configSchema, null, 2) + '\n');

process.stdout.write('✓ Generated schemas/config.schema.json\n');
