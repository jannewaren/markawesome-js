import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { applyPatterns, escapeHtml, md5Hex8, type Pattern } from './base.js';

/**
 * Transforms tooltip syntax into `<wa-tooltip>` elements attached to a
 * focusable anchor span via an auto-generated for/id pair.
 *   Inline (primary): (((anchor term >>> tip text)))
 *   Alternative block: :::wa-tooltip params\nanchor\n>>>\ntip\n:::
 * Tip content is plain text (HTML-escaped); literal `\n` becomes `<br>`.
 */
const TOOLTIP_ATTRIBUTES: AttributeSchema = {
  // The full wa-tooltip placement surface: the 4 primary plus 8 aligned variants.
  placement: [
    'top',
    'top-start',
    'top-end',
    'right',
    'right-start',
    'right-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'left-start',
    'left-end',
  ],
};

const INLINE_REGEX = /\(\(\([ \t]*([^\r\n]*?)[ \t]*>>>[ \t]*([^\r\n]+?)[ \t]*\)\)\)/g;
const ALTERNATIVE_REGEX = /^:::wa-tooltip([^\n]*)$\n([\s\S]*?)\n^>>>$\n([\s\S]*?)\n^:::$/gm;

const DISTANCE_TOKEN = /^distance:\d+$/;
// Skidding offsets along the target axis and may be negative.
const SKIDDING_TOKEN = /^skidding:-?\d+$/;

interface TooltipOptions {
  placement: string;
  distance: string | undefined;
  skidding: string | undefined;
}

export function transform(content: string): string {
  // Tracks ID-base usage so repeated tooltips get disambiguated suffixes.
  const seenIds: Record<string, number> = {};

  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => {
      const combined = captures[0] ?? '';
      const tipText = (captures[1] ?? '').trim();
      const [paramsString, anchorText] = parseInlineAnchorAndParams(combined);
      const { placement, distance, skidding } = parseParameters(paramsString);
      const tooltipId = generateTooltipId(anchorText, tipText, seenIds);
      return buildTooltipHtml(tooltipId, anchorText, tipText, { placement, distance, skidding });
    },
  };

  const alternativePattern: Pattern = {
    regex: ALTERNATIVE_REGEX,
    handler: (captures) => {
      const paramsString = captures[0] ?? '';
      const anchorText = (captures[1] ?? '').trim();
      const tipText = (captures[2] ?? '').trim();
      const { placement, distance, skidding } = parseParameters(paramsString);
      const tooltipId = generateTooltipId(anchorText, tipText, seenIds);
      return buildTooltipHtml(tooltipId, anchorText, tipText, { placement, distance, skidding });
    },
  };

  // Inline first to avoid conflicts with the block pattern.
  return applyPatterns(content, [inlinePattern, alternativePattern]);
}

function parseParameters(paramsString: string): TooltipOptions {
  if (!paramsString || paramsString.trim() === '') {
    return { placement: 'top', distance: undefined, skidding: undefined };
  }
  const attributes = parseAttributes(paramsString, TOOLTIP_ATTRIBUTES);
  const placement = attributes.placement || 'top';
  // Rightmost-wins for distance / skidding (skidding may be negative).
  const tokens = paramsString.trim().split(/\s+/);
  const distanceToken = [...tokens].reverse().find((token) => DISTANCE_TOKEN.test(token));
  const distance = distanceToken?.replace('distance:', '');
  const skiddingToken = [...tokens].reverse().find((token) => SKIDDING_TOKEN.test(token));
  const skidding = skiddingToken?.replace('skidding:', '');
  return { placement, distance, skidding };
}

function generateTooltipId(
  anchorText: string,
  tipText: string,
  seenIds: Record<string, number>,
): string {
  const base = `tooltip-${md5Hex8(`${anchorText}${tipText}`)}`;
  seenIds[base] = (seenIds[base] ?? 0) + 1;
  const occurrence = seenIds[base];
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

function isTooltipParam(token: string): boolean {
  return (
    Object.values(TOOLTIP_ATTRIBUTES).some((values) => values.includes(token)) ||
    DISTANCE_TOKEN.test(token) ||
    SKIDDING_TOKEN.test(token)
  );
}

function parseInlineAnchorAndParams(combinedString: string): [string, string] {
  const tokens = combinedString.trim().split(/\s+/);
  const paramTokens: string[] = [];
  const anchorTokens: string[] = [];
  let foundAnchor = false;

  for (const token of tokens) {
    if (!foundAnchor && isTooltipParam(token)) {
      paramTokens.push(token);
    } else {
      foundAnchor = true;
      anchorTokens.push(token);
    }
  }

  const anchorText = anchorTokens.join(' ');
  if (anchorText === '') return ['', combinedString.trim()];
  return [paramTokens.join(' '), anchorText];
}

function buildTooltipHtml(
  tooltipId: string,
  anchorText: string,
  tipText: string,
  options: TooltipOptions,
): string {
  const anchorContent = escapeHtml(anchorText);
  const tipEscaped = escapeHtml(tipText).replace(/\\n/g, '<br>');

  const tooltipAttrs = [`for="${tooltipId}"`, `placement="${options.placement}"`];
  if (options.distance) tooltipAttrs.push(`distance="${options.distance}"`);
  if (options.skidding) tooltipAttrs.push(`skidding="${options.skidding}"`);

  const anchor = buildAnchor(tooltipId, anchorContent);
  return `${anchor}<wa-tooltip ${tooltipAttrs.join(' ')}>${tipEscaped}</wa-tooltip>`;
}

// Focusable span so keyboard/AT users get the tip (tooltips fire on focus too).
function buildAnchor(tooltipId: string, anchorContent: string): string {
  const style = 'text-decoration: underline dotted; cursor: help;';
  return (
    `<span id="${tooltipId}" tabindex="0" class="ma-tooltip-anchor" ` +
    `style="${style}">${anchorContent}</span>`
  );
}
