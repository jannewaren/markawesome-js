import { parseAttributes, type ParsedAttributes } from '../attribute-parser.js';
import { ICON_ATTRIBUTE_SCHEMA, iconAttributePairs } from '../icon-attributes.js';
import { escapeHtml } from './base.js';

/**
 * Transforms icon syntax into `<wa-icon>` elements.
 *   Primary:     $$$icon-name              (decorative, name only)
 *   Alternative: :::wa-icon name [family] [variant] [animation]\n[label]\n:::
 */

// First-line params + optional multi-line body. The closer is anchored to a
// line start; the opener is intentionally not anchored so it still matches
// mid-prose. Ruby: /:::wa-icon[ \t]+([^\n]*?)[ \t]*\n(.*?)^:::/m
const ALTERNATIVE_REGEX = /:::wa-icon[ \t]+([^\n]*?)[ \t]*\n([\s\S]*?)^:::/gm;

// Ruby: /\$\$\$([a-zA-Z0-9\-_]+)(?![a-zA-Z0-9\-_]|\s+name\b)/
const PRIMARY_REGEX = /\$\$\$([a-zA-Z0-9\-_]+)(?![a-zA-Z0-9\-_]|\s+name\b)/g;

export function transform(content: string): string {
  const [protectedContent, codeBlocks] = protectCodeBlocks(content);

  // Primary syntax.
  let result = protectedContent.replace(PRIMARY_REGEX, (_m, iconName: string) =>
    buildIconHtml(iconName),
  );

  // Alternative syntax.
  result = result.replace(ALTERNATIVE_REGEX, (_m, firstLine: string, rawBody: string) => {
    const tokens = firstLine.trim().split(/\s+/);
    const iconName = tokens.shift() ?? '';
    const attributes = parseAttributes(tokens.join(' '), ICON_ATTRIBUTE_SCHEMA);
    const label = normalizeLabel(rawBody);
    return buildIconHtml(iconName, attributes, label);
  });

  return restoreCodeBlocks(result, codeBlocks);
}

function buildIconHtml(
  iconName: string,
  attributes: ParsedAttributes = {},
  label: string | null = null,
): string {
  const parts = [`name="${iconName.trim()}"`];
  parts.push(...iconAttributePairs(attributes));
  if (label && label !== '') parts.push(`label="${label}"`);
  return `<wa-icon ${parts.join(' ')}></wa-icon>`;
}

// Label is an attribute VALUE, not markup: strip, collapse whitespace, escape.
// Deliberately NOT run through the markdown renderer.
function normalizeLabel(rawBody: string): string | null {
  const text = (rawBody ?? '').trim().replace(/\s+/g, ' ');
  return text === '' ? null : escapeHtml(text);
}

// Icon-local code protection (independent of the pipeline-level protector) so
// the transformer is safe to call standalone. A single shared counter spans
// fenced then inline, matching the Ruby implementation.
function protectCodeBlocks(content: string): [string, Map<string, string>] {
  const codeBlocks = new Map<string, string>();
  let counter = 0;

  let protectedContent = content.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `<!--ICON_PROTECTED_CODE_BLOCK_${counter}-->`;
    codeBlocks.set(placeholder, match);
    counter += 1;
    return placeholder;
  });

  protectedContent = protectedContent.replace(/`[^`]+`/g, (match) => {
    const placeholder = `<!--ICON_PROTECTED_INLINE_CODE_${counter}-->`;
    codeBlocks.set(placeholder, match);
    counter += 1;
    return placeholder;
  });

  return [protectedContent, codeBlocks];
}

function restoreCodeBlocks(content: string, codeBlocks: Map<string, string>): string {
  let result = content;
  for (const [placeholder, original] of codeBlocks) {
    result = result.replaceAll(placeholder, () => original);
  }
  return result;
}
