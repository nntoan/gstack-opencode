import { describe, it, expect } from 'vitest';
import { transformSkillContent } from './content-transformer.ts';

const BROWSE_SKILL_EXCERPT = `_UPD=$(~/.codex/skills/gstack/bin/gstack-update-check 2>/dev/null || .agents/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_CONTRIB=$(~/.codex/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.codex/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")`;

const CAREFUL_SKILL_EXCERPT = `mkdir -p ~/.gstack/analytics
echo '{"skill":"careful","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true`;

describe('transformSkillContent', () => {
  it('removes $B binary references', () => {
    const input = 'Run $B config and also $B snapshot --flags';
    const result = transformSkillContent(input);
    expect(result).not.toContain('$B');
  });

  it('replaces ~/.codex/skills/gstack/bin/ paths', () => {
    const result = transformSkillContent(BROWSE_SKILL_EXCERPT);
    expect(result).not.toContain('~/.codex/skills/gstack/bin/');
    expect(result).toContain('gstack plugin internal:');
  });

  it('replaces ~/.claude/skills/gstack/ paths', () => {
    const input = 'Run ~/.claude/skills/gstack/bin/browse.sh --headless';
    const result = transformSkillContent(input);
    expect(result).not.toContain('~/.claude/skills/gstack/');
    expect(result).toContain('gstack plugin internal:');
  });

  it('converts ~/.gstack/ to .gstack/ (project-relative)', () => {
    const result = transformSkillContent(CAREFUL_SKILL_EXCERPT);
    expect(result).not.toContain('~/.gstack/');
    expect(result).toContain('.gstack/analytics');
  });

  it('replaces conductor.json references', () => {
    const input = 'Read conductor.json to get state';
    const result = transformSkillContent(input);
    expect(result).not.toContain('conductor.json');
    expect(result).toContain('.gstack/orchestrator/state.json');
  });

  it('preserves non-tool skill content', () => {
    const input = `## What is protected
| rm -rf | Recursive delete |
| DROP TABLE | Data loss |
Always pause before destructive operations.`;
    const result = transformSkillContent(input);
    expect(result).toContain('## What is protected');
    expect(result).toContain('rm -rf');
    expect(result).toContain('DROP TABLE');
    expect(result).toContain('Always pause before destructive operations.');
  });

  it('removes auto-generated gstack header comments', () => {
    const input = `<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->
# /careful — Destructive Command Guardrails`;
    const result = transformSkillContent(input);
    expect(result).not.toContain('AUTO-GENERATED');
    expect(result).not.toContain('gen:skill-docs');
    expect(result).toContain('# /careful');
  });
});
