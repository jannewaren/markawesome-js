import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns, escapeHtml, md5Hex8, type Pattern } from './base.js';

/**
 * Transforms popover syntax into `<wa-popover>` elements with trigger buttons.
 *   Inline:      &&&params? trigger >>> content&&&
 *   Primary:     &&&params\ntrigger\n>>>\ncontent\n&&&
 *   Alternative: :::wa-popover params\ntrigger\n>>>\ncontent\n:::
 */
const POPOVER_ATTRIBUTES: AttributeSchema = {
  // The full wa-popover placement surface: the 4 primary plus 8 aligned variants.
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
  without_arrow: ['without-arrow'],
  trigger_style: ['link'],
};

const INLINE_REGEX = /&&&[ \t]*([^\r\n]*?)[ \t]*>>>[ \t]*([^\r\n]+?)[ \t]*&&&/g;
const PRIMARY_REGEX = /^&&&([^\n]*)$\n([\s\S]*?)\n^>>>$\n([\s\S]*?)\n^&&&$/gm;
const ALTERNATIVE_REGEX = /^:::wa-popover([^\n]*)$\n([\s\S]*?)\n^>>>$\n([\s\S]*?)\n^:::$/gm;

const DISTANCE_TOKEN = /^distance:\d+$/;
// Skidding offsets along the target axis and may be negative.
const SKIDDING_TOKEN = /^skidding:-?\d+$/;

const LINK_TRIGGER_STYLE =
  'background: none; border: none; padding: 0; ' +
  'color: inherit; text-decoration: underline; ' +
  'text-decoration-style: dotted; ' +
  'cursor: pointer; font: inherit;';

interface PopoverOptions {
  placement: string;
  withoutArrow: boolean;
  distance: string | undefined;
  skidding: string | undefined;
  linkStyle?: boolean;
}

export function transform(content: string): string {
  // Tracks ID-base usage so repeated popovers get disambiguated suffixes.
  const seenIds: Record<string, number> = {};

  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => {
      const combined = captures[0] ?? '';
      const popoverContent = (captures[1] ?? '').trim();
      const [paramsString, triggerText] = parseInlineTriggerAndParams(combined);
      const { placement, withoutArrow, distance, skidding } = parseParameters(paramsString);
      const popoverId = generatePopoverId(triggerText, popoverContent, seenIds);
      return buildInlinePopoverHtml(popoverId, triggerText, popoverContent, {
        placement,
        withoutArrow,
        distance,
        skidding,
      });
    },
  };

  const blockProc = (paramsString = '', triggerTextRaw = '', popoverContentRaw = ''): string => {
    const triggerText = triggerTextRaw.trim();
    const popoverContent = popoverContentRaw.trim();
    const { placement, withoutArrow, distance, skidding, linkStyle } = parseParameters(paramsString);
    const popoverId = generatePopoverId(triggerText, popoverContent, seenIds);
    const contentHtml = renderMarkdown(popoverContent);
    return buildPopoverHtml(popoverId, triggerText, contentHtml, {
      placement,
      withoutArrow,
      distance,
      skidding,
      linkStyle,
    });
  };

  const patterns: Pattern[] = [
    inlinePattern,
    ...dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, blockProc),
  ];
  return applyPatterns(content, patterns);
}

function parseParameters(paramsString: string): PopoverOptions {
  if (!paramsString || paramsString.trim() === '') {
    return {
      placement: 'top',
      withoutArrow: false,
      distance: undefined,
      skidding: undefined,
      linkStyle: false,
    };
  }
  const attributes = parseAttributes(paramsString, POPOVER_ATTRIBUTES);
  const placement = attributes.placement || 'top';
  const withoutArrow = attributes.without_arrow === 'without-arrow';
  const linkStyle = attributes.trigger_style === 'link';
  const tokens = paramsString.trim().split(/\s+/);
  const distanceToken = tokens.find((token) => DISTANCE_TOKEN.test(token));
  const distance = distanceToken?.replace('distance:', '');
  const skiddingToken = tokens.find((token) => SKIDDING_TOKEN.test(token));
  const skidding = skiddingToken?.replace('skidding:', '');
  return { placement, withoutArrow, distance, skidding, linkStyle };
}

function generatePopoverId(
  triggerText: string,
  content: string,
  seenIds: Record<string, number>,
): string {
  const base = `popover-${md5Hex8(`${triggerText}${content}`)}`;
  seenIds[base] = (seenIds[base] ?? 0) + 1;
  const occurrence = seenIds[base];
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

function isPopoverParam(token: string): boolean {
  return (
    Object.values(POPOVER_ATTRIBUTES).some((values) => values.includes(token)) ||
    DISTANCE_TOKEN.test(token) ||
    SKIDDING_TOKEN.test(token)
  );
}

function parseInlineTriggerAndParams(combinedString: string): [string, string] {
  const tokens = combinedString.trim().split(/\s+/);
  const paramTokens: string[] = [];
  const triggerTokens: string[] = [];
  let foundContent = false;

  for (const token of tokens) {
    if (!foundContent && isPopoverParam(token)) {
      paramTokens.push(token);
    } else {
      foundContent = true;
      triggerTokens.push(token);
    }
  }

  const triggerText = triggerTokens.join(' ');
  if (triggerText === '') return ['', combinedString.trim()];
  return [paramTokens.join(' '), triggerText];
}

function buildInlinePopoverHtml(
  popoverId: string,
  triggerText: string,
  contentText: string,
  options: PopoverOptions,
): string {
  const triggerContent = escapeHtml(triggerText);
  const contentEscaped = escapeHtml(contentText).replace(/\\n/g, '<br>');

  const popoverAttrs = [`for='${popoverId}'`, `placement='${options.placement}'`];
  if (options.withoutArrow) popoverAttrs.push('without-arrow');
  if (options.distance) popoverAttrs.push(`distance='${options.distance}'`);
  if (options.skidding) popoverAttrs.push(`skidding='${options.skidding}'`);

  const trigger = buildTrigger(popoverId, triggerContent, true);
  return `${trigger}<wa-popover ${popoverAttrs.join(' ')}>${contentEscaped}</wa-popover>`;
}

function buildPopoverHtml(
  popoverId: string,
  triggerText: string,
  contentHtml: string,
  options: PopoverOptions,
): string {
  const triggerContent = escapeHtml(triggerText);

  const popoverAttrs = [`for='${popoverId}'`, `placement='${options.placement}'`];
  if (options.withoutArrow) popoverAttrs.push('without-arrow');
  if (options.distance) popoverAttrs.push(`distance='${options.distance}'`);
  if (options.skidding) popoverAttrs.push(`skidding='${options.skidding}'`);

  const trigger = buildTrigger(popoverId, triggerContent, options.linkStyle ?? false);
  return [trigger, `<wa-popover ${popoverAttrs.join(' ')}>`, contentHtml, '</wa-popover>'].join('\n');
}

function buildTrigger(popoverId: string, triggerContent: string, linkStyle: boolean): string {
  if (linkStyle) {
    return `<button type='button' id='${popoverId}' class='ma-popover-trigger' style='${LINK_TRIGGER_STYLE}'>${triggerContent}</button>`;
  }
  return `<wa-button id='${popoverId}' appearance='plain'>${triggerContent}</wa-button>`;
}
