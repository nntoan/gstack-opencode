# orchestrator/

Intent classification and delegation engine. Maps user text → intent → sprint phase → agent + skills. Core brain of the multi-agent workflow.

## Structure

```
orchestrator/
├── index.ts              # Barrel: createOrchestrator factory, Orchestrator interface
├── intent-classifier.ts  # classifyIntent, extractExplicitSkillName
├── intent-patterns.ts    # PHASE_PATTERNS, SKILL_TO_PHASE_MAP, PHASE_TO_DEFAULT_AGENT
├── delegation-engine.ts  # delegateIntent, getPhaseSkills
└── types.ts              # UserIntent, ClassifiedIntent, IntentClassifierOptions
```

## Where to Look

| Task                                 | File                   | Notes                                     |
| ------------------------------------ | ---------------------- | ----------------------------------------- |
| Change how user text maps to phases  | `intent-patterns.ts`   | `PHASE_PATTERNS` regex map                |
| Change which skills belong to phases | `intent-patterns.ts`   | `SKILL_TO_PHASE_MAP`                      |
| Change which agent handles a phase   | `intent-patterns.ts`   | `PHASE_TO_DEFAULT_AGENT`                  |
| Change delegation logic              | `delegation-engine.ts` | Phase → agent + skills resolution         |
| Change classification algorithm      | `intent-classifier.ts` | Regex matching, explicit skill extraction |

## Data Flow

```
User text
  → classifyIntent(text, options)    // intent-classifier.ts
    → match against PHASE_PATTERNS   // intent-patterns.ts
    → extract explicit skill name if present
    → return ClassifiedIntent { phase, skillName?, confidence }
  → delegateIntent(classified, options)  // delegation-engine.ts
    → resolve agent for phase (PHASE_TO_DEFAULT_AGENT)
    → resolve skills for phase (getPhaseSkills)
    → return DelegationResult { agent, skills, phase }
```

## Conventions

- `skills-only` mode skips agent resolution — returns skills without agent assignment
- Explicit skill names (e.g., `/ship`) take priority over pattern-based classification
- `orchestration_mode` from config controls whether agents are included in delegation results
- All pattern constants are in `intent-patterns.ts` — never hardcode patterns elsewhere

## Anti-Patterns

- **Never** add phase patterns in `intent-classifier.ts` — keep all patterns in `intent-patterns.ts`
- **Never** hardcode agent roles in `delegation-engine.ts` — use `PHASE_TO_DEFAULT_AGENT` map
- Changing `SKILL_TO_PHASE_MAP` without updating skill `name` fields will silently break skill routing
