/**
 * Replaces fenced code blocks with opaque placeholders so that the component
 * regexes (`:::`, `^^^`, `@@@`, …) cannot match syntax that appears inside
 * example code. Callers restore the blocks after their transformations run.
 *
 * The helper is stateless: each call allocates its own token map, so it is safe
 * to use concurrently or nested. The token format is a stable HTML comment so
 * that it survives markdown conversion intact.
 */

// Ruby: /```([a-zA-Z0-9.+#_-]+)?(\n.*?)```/m
// The `/m` (DOTALL) flag makes `.` span newlines -> `[\s\S]` in JS, plus `g`.
const CODE_BLOCK_PATTERN = /```([a-zA-Z0-9.+#_-]+)?(\n[\s\S]*?)```/g;
const PLACEHOLDER_PREFIX = '<!--MARKAWESOME_PROTECTED_CODE_BLOCK_';
const PLACEHOLDER_SUFFIX = '-->';

export interface ProtectResult {
  content: string;
  tokens: Map<string, string>;
}

/** Replace every fenced code block with a placeholder. */
export function protect(content: string): ProtectResult {
  const tokens = new Map<string, string>();
  let counter = 0;

  const protectedContent = content.replace(CODE_BLOCK_PATTERN, (match) => {
    const placeholder = `${PLACEHOLDER_PREFIX}${counter}${PLACEHOLDER_SUFFIX}`;
    tokens.set(placeholder, match);
    counter += 1;
    return placeholder;
  });

  return { content: protectedContent, tokens };
}

/** Restore placeholders created by {@link protect}. */
export function restore(content: string, tokens: Map<string, string>): string {
  if (!tokens || tokens.size === 0) return content;

  let result = content;
  for (const [placeholder, original] of tokens) {
    // Function replacement avoids `$`-pattern interpretation in `original`
    // (a restored code block may legitimately contain `$&`, `$1`, etc.).
    result = result.replaceAll(placeholder, () => original);
  }
  return result;
}
