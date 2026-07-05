import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms summary/details syntax into `<wa-details>` elements.
 *   Primary:     ^^^params?\nsummary\n>>>\ndetails\n^^^
 *   Alternative: :::wa-details params?\nsummary\n>>>\ndetails\n:::
 */
const COMPONENT_ATTRIBUTES: AttributeSchema = {
  appearance: ['outlined', 'filled', 'filled-outlined', 'plain'],
  icon_placement: ['start', 'end'],
  disabled: ['disabled'],
  open: ['open'],
};

const ICON_SLOTS: SlotConfig = {
  default: null,
  slots: ['expand', 'collapse'],
  slotMap: { expand: 'expand-icon', collapse: 'collapse-icon' },
};

// Ruby: /^\^\^\^?(.*?)\n(.*?)\n^>>>\n(.*?)\n^\^\^\^?/m  (opener/closer is `^^` or `^^^`)
const PRIMARY_REGEX = /^\^\^\^?(.*?)\n([\s\S]*?)\n^>>>\n([\s\S]*?)\n^\^\^\^?/gm;
const ALTERNATIVE_REGEX = /^:::wa-details\s*(.*?)\n([\s\S]*?)\n^>>>\n([\s\S]*?)\n:::/gm;

export function transform(content: string): string {
  const transformProc = (paramsString = '', summaryContent = '', detailsContent = ''): string => {
    const summary = summaryContent.trim();
    const details = detailsContent.trim();

    const iconResult = parseIconSlots(paramsString, ICON_SLOTS);
    const attributes = parseAttributes(iconResult.remaining, COMPONENT_ATTRIBUTES);
    const nameValue = extractNameValue(iconResult.remaining);

    const appearanceClass = normalizeAppearance(attributes.appearance);
    const iconPlacement = attributes.icon_placement || 'end';
    const summaryHtml = renderMarkdown(summary);
    const detailsHtml = renderMarkdown(details);

    const attrParts = [`appearance='${appearanceClass}'`, `icon-placement='${iconPlacement}'`];
    if (attributes.disabled) attrParts.push('disabled');
    if (attributes.open) attrParts.push('open');
    if (nameValue) attrParts.push(`name='${nameValue}'`);

    const iconHtml = iconsToHtml(iconResult.icons, ICON_SLOTS.slotMap);

    return (
      `<wa-details ${attrParts.join(' ')}>` +
      `<span slot='summary'>${summaryHtml}</span>` +
      `${iconHtml}${detailsHtml}</wa-details>`
    );
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/**
 * Degrade to a native HTML `<details>` block. The body is emitted verbatim (not
 * markdown-converted), matching the Ruby engine.
 */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', summaryContent = '', detailsContent = ''): string => {
    const summary = (summaryContent ?? '').trim();
    const details = (detailsContent ?? '').trim();
    return `<details>\n<summary>${summary}</summary>\n\n${details}\n</details>`;
  };
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function extractNameValue(paramsString: string): string | null {
  if (!paramsString || paramsString.trim() === '') return null;
  const tokens = paramsString.trim().split(/\s+/);
  const nameToken = tokens.find((token) => token.startsWith('name:'));
  return nameToken ? nameToken.replace(/^name:/, '') : null;
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
