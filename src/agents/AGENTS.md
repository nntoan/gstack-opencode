# agents/

13 agent definitions. Each file exports a `GstackAgent` constant with role, description, instructions, model hint, and sprint phase.

## Structure

```
agents/
├── index.ts          # Barrel: ALL_AGENTS array + createGstackAgents, getAgentByRole, getAgentsByPhase
├── types.ts          # CreateAgentsOptions type
├── ceo.ts            # Strategic direction, decomposition
├── eng-manager.ts    # Planning, execution framing
├── designer.ts       # UX/product design decisions
├── builder.ts        # Implementation execution
├── reviewer.ts       # Code quality, review
├── debugger.ts       # Root-cause analysis, fixes
├── qa-lead.ts        # Test strategy, QA
├── release-engineer.ts  # Release readiness, publishing
├── doc-engineer.ts   # Documentation, handoff quality
├── retro-lead.ts     # Retrospectives, process improvement
├── safety-guard.ts   # Risk/safety policy checks
├── upgrader.ts       # Dependency/runtime upgrade guidance
└── session-manager.ts   # Session continuity, context management
```

## Where to Look

| Task                        | File                                                           | Notes                                    |
| --------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| Add new agent               | Create `{role}.ts`, add to `index.ts` imports and `ALL_AGENTS` | Follow existing agent file pattern       |
| Disable agent               | `GstackConfig.disabled_agents`                                 | Filtered in `createGstackAgents`         |
| Override model/instructions | `GstackConfig.agents.{role}`                                   | Applied in `create-skills-and-agents.ts` |
| Filter by sprint phase      | `getAgentsByPhase(phase)`                                      | Returns agents for plan/build/ship/retro |

## Conventions

- One agent per file, named export matching `{role}Agent` (e.g., `ceoAgent`)
- Agent role string is kebab-case (`'release-engineer'`, not `'releaseEngineer'`)
- `sprintPhase` determines when the orchestrator may select the agent (`plan`, `build`, `ship`, `retro`, or `any`)
- `skills-only` orchestration mode returns zero agents — all delegation goes through skills

## Anti-Patterns

- **Never** add an agent without adding it to `ALL_AGENTS` in `index.ts`
- **Never** use PascalCase or camelCase for the `role` field — must be kebab-case
- Agent instructions are long strings (markdown-like) — keep formatting consistent with existing agents
