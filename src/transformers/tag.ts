import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns, type Pattern } from './base.js';

/**
 * Transforms tag syntax into `<wa-tag>` elements.
 *   Primary block: @@@params?\ncontent\n@@@
 *   Inline:        @@@ params? content @@@
 *   Alternative:   :::wa-tag params?\ncontent\n:::
 */
const COMPONENT_ATTRIBUTES: AttributeSchema = {
  variant: ['brand', 'success', 'neutral', 'warning', 'danger'],
  appearance: ['accent', 'filled', 'outlined', 'filled-outlined'],
  size: ['xs', 's', 'm', 'l', 'xl', 'small', 'medium', 'large'],
  pill: ['pill'],
  'with-remove': ['with-remove'],
};

const ICON_SLOTS: SlotConfig = { default: 'content', slots: ['content'] };

// Block syntax (multiline; supports both LF and CRLF). Ruby `\h` (horizontal
// whitespace) becomes `[ \t]`.
const PRIMARY_REGEX = /^@@@([^\r\n]*?)\r?\n([\s\S]*?)\r?\n@@@/gm;
const ALTERNATIVE_REGEX = /^:::wa-tag\s*([^\r\n]*?)\r?\n([\s\S]*?)\r?\n:::/gm;
// Inline syntax (same line). `[^@\r\n]` can't span newlines, so the inline rule
// never swallows a block form.
const INLINE_REGEX = /@@@[ \t]*([^@\r\n]+?)[ \t]*@@@/g;

function isAttributeToken(token: string): boolean {
  return Object.values(COMPONENT_ATTRIBUTES).some((values) => values.includes(token));
}

export function transform(content: string): string {
  const blockProc = (_params = '', tagContent = ''): string =>
    buildTagHtml(tagContent.trim(), _params);

  const inlineProc = (fullContent: string): string => {
    fullContent = fullContent.trim();
    const tokens = fullContent.split(/\s+/);
    const paramTokens: string[] = [];
    const contentTokens: string[] = [];

    for (const token of tokens) {
      if (isAttributeToken(token) || token.startsWith('icon:')) {
        paramTokens.push(token);
      } else {
        contentTokens.push(token);
      }
    }

    const params = paramTokens.join(' ');
    const tagContent = contentTokens.length > 0 ? contentTokens.join(' ') : fullContent;
    return buildTagHtml(tagContent, params);
  };

  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => inlineProc(captures[0] ?? ''),
  };

  // Inline first to avoid conflicts with the block patterns.
  const patterns: Pattern[] = [
    inlinePattern,
    ...dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, blockProc),
  ];
  return applyPatterns(content, patterns);
}

/**
 * Degrade a tag to bold `**text**`. The inline form strips attribute tokens and
 * `icon:*` first (falling back to the full content if every token was an
 * attribute); an empty tag → ''.
 */
export function renderAsMarkdown(content: string): string {
  const blockProc = (_params = '', tagContent = ''): string => {
    const text = (tagContent ?? '').trim();
    return text === '' ? '' : `**${text}**`;
  };

  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => {
      const fullContent = (captures[0] ?? '').trim();
      const contentTokens = fullContent
        .split(/\s+/)
        .filter((token) => !(isAttributeToken(token) || token.startsWith('icon:')));
      const rendered = contentTokens.length > 0 ? contentTokens.join(' ') : fullContent;
      return rendered === '' ? '' : `**${rendered}**`;
    },
  };

  const patterns: Pattern[] = [
    inlinePattern,
    ...dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, blockProc),
  ];
  return applyPatterns(content, patterns);
}

function buildTagHtml(content: string, params: string): string {
  const iconResult = parseIconSlots(params, ICON_SLOTS);
  const attributes = parseAttributes(iconResult.remaining, COMPONENT_ATTRIBUTES);

  const htmlAttrs: string[] = [];
  if (attributes.variant) htmlAttrs.push(`variant="${attributes.variant}"`);
  if (attributes.appearance) htmlAttrs.push(`appearance="${attributes.appearance}"`);
  if (attributes.size) htmlAttrs.push(`size="${attributes.size}"`);
  if (attributes.pill) htmlAttrs.push('pill');
  if (attributes['with-remove']) htmlAttrs.push('with-remove');

  const attrsString = htmlAttrs.length === 0 ? '' : ` ${htmlAttrs.join(' ')}`;
  const iconHtml = iconsToHtml(iconResult.icons);

  let tagHtml = renderMarkdown(content).trim();
  tagHtml = tagHtml.replace(/^<p>([\s\S]*)<\/p>$/m, (_m, inner: string) => inner);

  return `<wa-tag${attrsString}>${iconHtml}${tagHtml}</wa-tag>`;
}
