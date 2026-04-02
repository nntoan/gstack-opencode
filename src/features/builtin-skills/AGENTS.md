# builtin-skills/

25 built-in skills that define agent workflows. Each skill is a `BuiltinSkill` constant with name, description, template (markdown instructions), allowed tools, agent hints, and argument patterns.

## Structure

```
builtin-skills/
├── index.ts          # Feature barrel
├── skills.ts         # createBuiltinSkills factory — filters by disabledSkills
├── types.ts          # BuiltinSkillDefinition, CreateSkillsOptions
└── skills/
    ├── index.ts      # Barrel: ALL_BUILTIN_SKILLS array
    ├── benchmark.ts  # Performance benchmarking workflow
    ├── browse.ts     # Browser automation skill
    ├── canary.ts     # Canary deployment checks
    ├── careful.ts    # Safety advisory overlay
    ├── codex.ts      # Code generation constraints
    ├── design-consultation.ts  # Design review with font/style rules
    ├── design-review.ts        # Design review workflow
    ├── document-release.ts     # Changelog + release docs (many NEVER rules)
    ├── freeze.ts     # File edit safety overlay
    ├── guard.ts      # Destructive command warnings
    ├── investigate.ts          # Investigation with structured AskUserQuestion
    ├── land-and-deploy.ts      # Land PR + deploy workflow
    ├── office-hours.ts         # Design-only consultation (no implementation)
    ├── plan-ceo-review.ts      # CEO-level plan review
    ├── plan-design-review.ts   # Design-level plan review
    ├── plan-eng-review.ts      # Engineering plan review
    ├── qa-only.ts    # QA-only (NEVER fix anything)
    ├── qa.ts         # Full QA workflow
    ├── retro.ts      # Retrospective generation
    ├── review.ts     # Code review skill
    ├── setup-browser-cookies.ts  # Browser cookie setup guide
    ├── setup-deploy.ts           # Deployment configuration
    ├── ship.ts       # Release/ship automation (many safety rules)
    ├── unfreeze.ts   # Remove freeze overlay
    └── upgrade.ts    # Dependency upgrade guidance
```

## Where to Look

| Task                     | File                                                     | Notes                                        |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| Add new skill            | Create `skills/{name}.ts`, export from `skills/index.ts` | Follow existing skill pattern                |
| Disable skill            | `GstackConfig.disabled_skills`                           | Filtered in `createBuiltinSkills`            |
| Skill template variables | `src/features/skill-adapter/`                            | Template resolution + content transformation |
| Skill → agent mapping    | `src/features/orchestrator/intent-patterns.ts`           | `SKILL_TO_PHASE_MAP`                         |

## Conventions

- One skill per file, named export matching `{name}Skill` (e.g., `shipSkill`)
- Templates are markdown strings with `{{variable}}` placeholders resolved at runtime
- Each skill has a colocated `*.test.ts` testing the skill constant shape (name, template content assertions)
- Skills with safety rules embed `NEVER` / `ALWAYS` / `CRITICAL` directives directly in the template string

## Anti-Patterns

- **Never** add a skill without adding it to `ALL_BUILTIN_SKILLS` in `skills/index.ts`
- **Never** modify a skill's `name` field without updating `SKILL_TO_PHASE_MAP` in orchestrator
- Safety-critical skills (`ship`, `document-release`, `guard`) have strict wording — changing `NEVER` directives requires careful review
