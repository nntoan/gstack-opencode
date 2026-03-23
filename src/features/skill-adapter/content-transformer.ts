/**
 * Transforms raw gstack SKILL.md content for OpenCode compatibility.
 * Removes Claude Code / gstack binary references and adapts paths.
 */

/**
 * Transforms raw gstack SKILL.md content to be OpenCode-compatible.
 * Replaces binary references, absolute paths, and Claude Code-specific hooks.
 *
 * @param rawContent - Raw SKILL.md content from gstack
 * @returns Transformed content safe for use in OpenCode
 */
export function transformSkillContent(rawContent: string): string {
  let content = rawContent;

  content = content.replace(/\$B\s+(\S+)/g, 'use gstack plugin internal:$1');
  content = content.replace(/~\/\.codex\/skills\/gstack\/bin\//g, 'gstack plugin internal:');
  content = content.replace(/~\/\.claude\/skills\/gstack\/bin\//g, 'gstack plugin internal:');
  content = content.replace(/~\/\.gstack\//g, '.gstack/');
  content = content.replace(/conductor\.json/g, '.gstack/orchestrator/state.json');
  content = content.replace(
    /^<!-- AUTO-GENERATED from SKILL\.md\.tmpl — do not edit directly -->\n/m,
    ''
  );
  content = content.replace(/^<!-- Regenerate: bun run gen:skill-docs -->\n/m, '');

  return content;
}
