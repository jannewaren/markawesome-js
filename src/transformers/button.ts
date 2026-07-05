import { parseAttributes, type AttributeSchema, type ParsedAttributes } from '../attribute-parser.js';
import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms button syntax into `<wa-button>` elements.
 *   Primary:     %%%attributes?\ncontent\n%%%
 *   Alternative: :::wa-button attributes?\ncontent\n:::
 *
 * Link-form (content is a markdown link) additionally supports target/download.
 */
export const BUTTON_ATTRIBUTES: AttributeSchema = {
  variant: ['brand', 'success', 'neutral', 'warning', 'danger'],
  appearance: ['accent', 'filled', 'outlined', 'filled-outlined', 'plain'],
  size: ['xs', 's', 'm', 'l', 'xl', 'small', 'medium', 'large'],
  pill: ['pill'],
  caret: ['caret'],
  loading: ['loading'],
  disabled: ['disabled'],
  target: ['_blank', '_self', '_parent', '_top'],
  download: ['download'],
};

const ICON_SLOTS: SlotConfig = { default: 'start', slots: ['start', 'end'] };

const LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)$/;

const PRIMARY_REGEX = /^%%%([^\n]*)\n([\s\S]*?)\n%%%/gm;
const ALTERNATIVE_REGEX = /^:::wa-button\s*([^\n]*)\n([\s\S]*?)\n:::/gm;

export function transform(content: string): string {
  const transformProc = (paramsString = '', buttonContent = ''): string => {
    const iconResult = parseIconSlots(paramsString, ICON_SLOTS);
    const attributes = parseAttributes(iconResult.remaining, BUTTON_ATTRIBUTES);
    return buildButtonHtml(buttonContent.trim(), attributes, iconResult.icons);
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/**
 * Degrade a button to plain markdown: a link-form button (`[text](url)`) stays
 * a link; any other button becomes bold `**text**`; an empty button degrades to
 * ''.
 */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', buttonContent = ''): string => {
    const text = (buttonContent ?? '').trim();
    const linkMatch = text.match(LINK_REGEX);
    if (linkMatch) return `[${linkMatch[1]}](${linkMatch[2]})`;
    return text === '' ? '' : `**${text}**`;
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function buildButtonHtml(
  content: string,
  attributes: ParsedAttributes,
  icons: Record<string, string>,
): string {
  const htmlAttrs: string[] = [];
  if (attributes.variant) htmlAttrs.push(`variant="${attributes.variant}"`);
  if (attributes.appearance) htmlAttrs.push(`appearance="${attributes.appearance}"`);
  if (attributes.size) htmlAttrs.push(`size="${attributes.size}"`);
  if (attributes.pill) htmlAttrs.push('pill');
  if (attributes.caret) htmlAttrs.push('with-caret');
  if (attributes.loading) htmlAttrs.push('loading');
  if (attributes.disabled) htmlAttrs.push('disabled');

  const attrsString = htmlAttrs.length === 0 ? '' : ` ${htmlAttrs.join(' ')}`;
  const iconHtml = iconsToHtml(icons);

  const linkMatch = content.match(LINK_REGEX);

  if (linkMatch) {
    const linkText = linkMatch[1]!;
    const linkUrl = linkMatch[2]!;
    const buttonHtml = formatInline(linkText);
    const linkAttrsString = linkPassThroughAttrs(attributes);
    return `<wa-button${attrsString} href="${linkUrl}"${linkAttrsString}>${iconHtml}${buttonHtml}</wa-button>`;
  }

  const buttonHtml = formatInline(content);
  return `<wa-button${attrsString}>${iconHtml}${buttonHtml}</wa-button>`;
}

// Render inline markdown, drop the wrapping <p>, and protect trailing
// whitespace after closing tags (same treatment as badges).
function formatInline(content: string): string {
  let html = renderMarkdown(content).trim();
  html = html.replace(/^<p>([\s\S]*)<\/p>$/m, (_m, inner: string) => inner);
  html = html.replace(/(<\/\w+>)\s+/g, (_m, tag: string) => `${tag}&nbsp;`);
  return html;
}

// Plain anchor pass-throughs, meaningful only on link-form buttons. Auto-emit
// rel="noopener noreferrer" with target="_blank" to guard against reverse
// tabnabbing.
function linkPassThroughAttrs(attributes: ParsedAttributes): string {
  const linkAttrs: string[] = [];
  if (attributes.target) linkAttrs.push(`target="${attributes.target}"`);
  if (attributes.target === '_blank') linkAttrs.push('rel="noopener noreferrer"');
  if (attributes.download) linkAttrs.push('download');
  return linkAttrs.length === 0 ? '' : ` ${linkAttrs.join(' ')}`;
}
