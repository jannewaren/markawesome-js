import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns, escapeHtml } from './base.js';

/**
 * Transforms accordion syntax into `<wa-accordion>` / `<wa-accordion-item>`.
 *   Primary:     //////attrs?\n/// flags? label\nbody\n///\n…\n//////
 *   Alternative: :::wa-accordion attrs?\n…\n:::
 *
 * Runs last in the pipeline so item bodies may contain other already-transformed
 * components.
 */
const CONTAINER_ATTRIBUTES: AttributeSchema = {
  appearance: ['outlined', 'filled', 'filled-outlined', 'plain'],
  mode: ['multiple', 'single', 'single-collapsible'],
  icon_placement: ['start', 'end'],
};

const ICON_SLOTS: SlotConfig = {
  default: 'icon',
  slots: ['icon'],
  slotMap: { icon: 'icon' },
};

const ITEM_FLAGS = ['expanded', 'disabled'];

const PRIMARY_REGEX = /^\/{6}([^\n]*)\n((?:\/{3} [^\n]+\n[\s\S]*?\n\/{3}\n?)+)\/{6}/gm;
const ALTERNATIVE_REGEX = /^:::wa-accordion\s*([^\n]*)\n((?:\/{3} [^\n]+\n[\s\S]*?\n\/{3}\n?)+):::/gm;
const ITEM_REGEX = /^\/{3} ([^\n]+)\n([\s\S]*?)\n\/{3}/gm;

export function transform(content: string): string {
  const transformProc = (paramsString = '', itemsBlock = ''): string => {
    const attributes = parseAttributes(paramsString.trim(), CONTAINER_ATTRIBUTES);
    const headingLevel = extractHeadingLevel(paramsString);

    const attrParts = [`appearance="${normalizeAppearance(attributes.appearance)}"`];
    if (attributes.mode) attrParts.push(`mode="${attributes.mode}"`);
    if (attributes.icon_placement) attrParts.push(`icon-placement="${attributes.icon_placement}"`);
    if (headingLevel) attrParts.push(`heading-level="${headingLevel}"`);

    return `<wa-accordion ${attrParts.join(' ')}>${buildItems(itemsBlock)}</wa-accordion>`;
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/**
 * Degrade an accordion to sequential `### label` sections joined by blank lines
 * (leading flag/icon tokens stripped from each heading).
 */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', itemsBlock = ''): string => {
    const sections: string[] = [];
    for (const match of itemsBlock.matchAll(ITEM_REGEX)) {
      const iconResult = parseIconSlots(match[1]!, ICON_SLOTS);
      const [, label] = parseItemFlagsAndLabel(iconResult.remaining);
      sections.push(`### ${label}\n\n${match[2]!.trim()}`);
    }
    return sections.join('\n\n');
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function buildItems(itemsBlock: string): string {
  const items: string[] = [];
  for (const match of itemsBlock.matchAll(ITEM_REGEX)) {
    const header = match[1]!;
    const body = match[2]!;

    const iconResult = parseIconSlots(header, ICON_SLOTS);
    const [flags, label] = parseItemFlagsAndLabel(iconResult.remaining);

    const itemAttrs = [`label="${escapeHtml(label)}"`];
    if (flags.includes('expanded')) itemAttrs.push('expanded');
    if (flags.includes('disabled')) itemAttrs.push('disabled');

    const iconHtml = iconsToHtml(iconResult.icons, ICON_SLOTS.slotMap);
    const bodyHtml = renderMarkdown(body.trim());

    items.push(
      `<wa-accordion-item ${itemAttrs.join(' ')}>${iconHtml}${bodyHtml}</wa-accordion-item>`,
    );
  }
  return items.join('');
}

// Consume leading expanded/disabled tokens; the remainder is the label.
function parseItemFlagsAndLabel(remaining: string): [string[], string] {
  const tokens = (remaining ?? '').trim() === '' ? [] : remaining.trim().split(/\s+/);
  const flags: string[] = [];
  while (tokens.length > 0 && ITEM_FLAGS.includes(tokens[0]!)) {
    flags.push(tokens.shift()!);
  }
  return [flags, tokens.join(' ')];
}

function extractHeadingLevel(paramsString: string): string | null {
  if (!paramsString || paramsString.trim() === '') return null;
  const token = paramsString
    .trim()
    .split(/\s+/)
    .find((t) => t.startsWith('heading:'));
  if (!token) return null;
  const value = token.replace(/^heading:/, '');
  if (value === 'none' || /^[1-6]$/.test(value)) return value;
  return null;
}

function normalizeAppearance(appearance: string | undefined): string {
  switch (appearance) {
    case 'filled':
      return 'filled';
    case 'filled-outlined':
      return 'filled-outlined';
    case 'plain':
      return 'plain';
    default:
      return 'outlined';
  }
}
