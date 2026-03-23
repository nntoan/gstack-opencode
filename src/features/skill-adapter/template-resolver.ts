import { DEFAULT_PLACEHOLDERS } from './placeholder-content.ts';

/**
 * Resolves {{PLACEHOLDER_NAME}} patterns in gstack skill template content.
 * Unknown placeholders are left as-is (no error thrown).
 *
 * @param templateContent - Raw template string with {{PLACEHOLDER}} patterns
 * @param placeholders - Map of placeholder name to replacement content
 * @returns Resolved content with placeholders replaced
 */
export function resolveTemplate(
  templateContent: string,
  placeholders: Record<string, string> = DEFAULT_PLACEHOLDERS
): string {
  return templateContent.replace(/\{\{([A-Z_]+)\}\}/g, (match, name: string) => {
    return Object.prototype.hasOwnProperty.call(placeholders, name) ? placeholders[name] : match;
  });
}

/**
 * The 9 standard gstack placeholder names.
 */
export const GSTACK_PLACEHOLDER_NAMES = [
  'PREAMBLE',
  'COMMAND_REFERENCE',
  'SNAPSHOT_FLAGS',
  'BROWSE_SETUP',
  'BASE_BRANCH_DETECT',
  'QA_METHODOLOGY',
  'DESIGN_METHODOLOGY',
  'REVIEW_DASHBOARD',
  'TEST_BOOTSTRAP',
] as const;

export type GstackPlaceholderName = (typeof GSTACK_PLACEHOLDER_NAMES)[number];
