import { parseAttributes, type AttributeSchema, type ParsedAttributes } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms badge syntax into `<wa-badge>` elements.
 *   Primary:     !!!params?\ncontent\n!!!
 *   Alternative: :::wa-badge params?\ncontent\n:::
 *
 * Params (space-separated, any order, rightmost-wins for conflicts):
 *   variant: brand success neutral warning danger
 *   appearance: accent filled outlined filled-outlined
 *   attention: none pulse bounce
 *   flag: pill
 */
export const BADGE_ATTRIBUTES: AttributeSchema = {
  variant: ['brand', 'success', 'neutral', 'warning', 'danger'],
  appearance: ['accent', 'filled', 'outlined', 'filled-outlined'],
  attention: ['none', 'pulse', 'bounce'],
  pill: ['pill'],
};

// Ruby: /^!!!(.*?)\n(.*?)\n!!!/m  and  /^:::wa-badge\s*(.*?)\n(.*?)\n:::/m
const PRIMARY_REGEX = /^!!!(.*?)\n([\s\S]*?)\n!!!/gm;
const ALTERNATIVE_REGEX = /^:::wa-badge\s*(.*?)\n([\s\S]*?)\n:::/gm;

export function transform(content: string): string {
  const transformProc = (paramsString = '', badgeContent = ''): string => {
    const attributes = parseAttributes(paramsString, BADGE_ATTRIBUTES);
    return buildBadgeHtml(badgeContent.trim(), attributes);
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/** Degrade a badge to bold `**text**` (variant dropped); an empty badge → ''. */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', badgeContent = ''): string => {
    const text = (badgeContent ?? '').trim();
    return text === '' ? '' : `**${text}**`;
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function buildBadgeHtml(content: string, attributes: ParsedAttributes): string {
  let badgeHtml = renderMarkdown(content).trim();

  // Remove paragraph tags if the content is just one paragraph.
  badgeHtml = badgeHtml.replace(/^<p>([\s\S]*)<\/p>$/m, (_m, inner: string) => inner);

  // Fix whitespace collapse after closing tags by inserting a non-breaking space.
  badgeHtml = badgeHtml.replace(/(<\/\w+>)\s+/g, (_m, tag: string) => `${tag}&nbsp;`);

  const attrParts: string[] = [];
  if (attributes.variant) attrParts.push(`variant="${attributes.variant}"`);
  if (attributes.appearance) attrParts.push(`appearance="${attributes.appearance}"`);
  if (attributes.attention) attrParts.push(`attention="${attributes.attention}"`);
  if (attributes.pill) attrParts.push('pill');

  const attrsString = attrParts.length === 0 ? '' : ` ${attrParts.join(' ')}`;
  return `<wa-badge${attrsString}>${badgeHtml}</wa-badge>`;
}
