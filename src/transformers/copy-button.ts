import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms copy-button syntax into `<wa-copy-button>` elements.
 *   Primary:     <<<params?\ncontent\n<<<
 *   Alternative: :::wa-copy-button params?\ncontent\n:::
 *
 * Content becomes the `value` attribute verbatim (quote-escaped only) — it is
 * NOT markdown-rendered. Params: placement, tooltip:mode, numeric duration,
 * disabled, copy/success/error labels, from.
 */
const COPY_BUTTON_ATTRIBUTES: AttributeSchema = {
  placement: ['top', 'right', 'bottom', 'left'],
  disabled: ['disabled'],
};
const TOOLTIP_MODES = ['full', 'copy', 'none'];

const PRIMARY_REGEX = /^<<<(.*?)\n([\s\S]*?)\n<<</gm;
const ALTERNATIVE_REGEX = /^:::wa-copy-button\s*(.*?)\n([\s\S]*?)\n:::/gm;

interface CopyAttributes {
  placement?: string;
  disabled?: string;
  copy_label?: string;
  success_label?: string;
  error_label?: string;
  from?: string;
  feedback_duration?: string;
  tooltip?: string;
}

export function transform(content: string): string {
  const transformProc = (paramsString = '', copyContent = ''): string => {
    const attributes: CopyAttributes = { ...parseAttributes(paramsString, COPY_BUTTON_ATTRIBUTES) };

    attributes.copy_label = extractQuotedAttribute(paramsString, 'copy-label');
    attributes.success_label = extractQuotedAttribute(paramsString, 'success-label');
    attributes.error_label = extractQuotedAttribute(paramsString, 'error-label');
    attributes.from = extractQuotedAttribute(paramsString, 'from');

    const durationMatch = paramsString.match(/\b(\d+)\b/);
    if (durationMatch) attributes.feedback_duration = durationMatch[1];

    const tooltipModeRegex = new RegExp(`\\btooltip:(${TOOLTIP_MODES.join('|')})\\b`);
    const tooltipMatch = paramsString.match(tooltipModeRegex);
    if (tooltipMatch) attributes.tooltip = tooltipMatch[1];

    return buildCopyButtonHtml(copyContent.trim(), attributes);
  };

  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

/** Degrade a copy-button to its bare (trimmed) content, dropping the wrapper. */
export function renderAsMarkdown(content: string): string {
  const transformProc = (_paramsString = '', copyContent = ''): string => (copyContent ?? '').trim();
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function buildCopyButtonHtml(content: string, attributes: CopyAttributes): string {
  // Escape only quotes for the value attribute (matches Ruby: not & < >).
  const escapedContent = content.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const attrParts: string[] = [];
  attrParts.push(attributes.from ? `from="${attributes.from}"` : `value="${escapedContent}"`);
  if (attributes.placement) attrParts.push(`tooltip-placement="${attributes.placement}"`);
  if (attributes.tooltip) attrParts.push(`tooltip="${attributes.tooltip}"`);
  if (attributes.copy_label) attrParts.push(`copy-label="${attributes.copy_label}"`);
  if (attributes.success_label) attrParts.push(`success-label="${attributes.success_label}"`);
  if (attributes.error_label) attrParts.push(`error-label="${attributes.error_label}"`);
  if (attributes.feedback_duration)
    attrParts.push(`feedback-duration="${attributes.feedback_duration}"`);
  if (attributes.disabled) attrParts.push('disabled');

  return `<wa-copy-button ${attrParts.join(' ')}></wa-copy-button>`;
}

function extractQuotedAttribute(paramsString: string, attrName: string): string | undefined {
  const escaped = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = paramsString.match(new RegExp(`${escaped}=["']([^"']+)["']`));
  return match ? match[1] : undefined;
}
