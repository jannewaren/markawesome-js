import { parseAttributes, type AttributeSchema, type ParsedAttributes } from '../attribute-parser.js';
import { getConfiguration } from '../config.js';
import { ICON_ATTRIBUTE_SCHEMA, iconAttributePairs } from '../icon-attributes.js';
import { parseIconSlots, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms callout syntax into `<wa-callout>` elements.
 *   Primary:     :::variant [size] [appearance]\ncontent\n:::
 *   Alternative: :::wa-callout variant [size] [appearance]\ncontent\n:::
 * Variants: brand, info (alias for brand), success, neutral, warning, danger.
 */
const VARIANTS = ['info', 'brand', 'success', 'neutral', 'warning', 'danger'];
const CALLOUT_ATTRIBUTES: AttributeSchema = {
  size: ['xs', 's', 'm', 'l', 'xl', 'small', 'medium', 'large'],
  appearance: ['accent', 'filled', 'outlined', 'plain', 'filled-outlined'],
};
const VARIANT_ALIASES: Record<string, string> = { info: 'brand' };
const ICON_SLOTS: SlotConfig = { default: 'icon', slots: ['icon'] };

// Brand-keyed fallback used while the global configuration is unset. This is
// deliberately distinct from config.ts's info-keyed default map (see config.ts).
const DEFAULT_ICONS: Record<string, string> = {
  brand: 'circle-info',
  success: 'circle-check',
  neutral: 'gear',
  warning: 'triangle-exclamation',
  danger: 'circle-exclamation',
};

const variantPattern = VARIANTS.join('|');
const PRIMARY_REGEX = new RegExp(`^:::(${variantPattern})([^\\n]*)\\n([\\s\\S]*?)\\n:::`, 'gm');
const ALTERNATIVE_REGEX = new RegExp(
  `^:::wa-callout\\s+(${variantPattern})([^\\n]*)\\n([\\s\\S]*?)\\n:::`,
  'gm',
);

export function transform(content: string): string {
  const transformProc = (variant = '', extraParams = '', innerContent = ''): string => {
    const actualVariant = VARIANT_ALIASES[variant] ?? variant;

    // CALLOUT_ATTRIBUTES and ICON_ATTRIBUTE_SCHEMA namespaces are disjoint, so
    // the same remaining-token string can be parsed against both independently.
    const iconResult = parseIconSlots(extraParams, ICON_SLOTS);
    const extraAttrs = parseAttributes(iconResult.remaining, CALLOUT_ATTRIBUTES);
    const iconAttrs = parseAttributes(iconResult.remaining, ICON_ATTRIBUTE_SCHEMA);
    if (!iconAttrs.variant) iconAttrs.variant = 'solid'; // preserve historical default

    const attrParts = [`variant="${actualVariant}"`];
    if (extraAttrs.appearance) attrParts.push(`appearance="${extraAttrs.appearance}"`);
    if (extraAttrs.size) attrParts.push(`size="${extraAttrs.size}"`);

    const iconName = iconResult.icons['icon'] ?? iconNameFor(actualVariant);
    const iconHtml = calloutIconHtml(iconName, iconAttrs);
    const htmlContent = `${iconHtml}${renderMarkdown(innerContent)}`;

    return `<wa-callout ${attrParts.join(' ')}>${htmlContent}</wa-callout>`;
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function iconNameFor(variant: string): string | undefined {
  const icons = getConfiguration()?.calloutIcons ?? DEFAULT_ICONS;
  return icons[variant];
}

function calloutIconHtml(name: string | undefined, attributes: ParsedAttributes): string {
  // A nil/undefined name interpolates to an empty string, matching Ruby.
  const parts = ['slot="icon"', `name="${name ?? ''}"`];
  parts.push(...iconAttributePairs(attributes));
  return `<wa-icon ${parts.join(' ')}></wa-icon>`;
}
