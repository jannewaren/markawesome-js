import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { parseIconSlots, iconsToHtml, type SlotConfig } from '../icon-slot-parser.js';
import { renderMarkdown } from '../markdown.js';

/**
 * Transforms labeled-divider syntax into `<wa-divider>` elements with a label in
 * the default slot (Web Awesome 3.13.0+).
 *   Primary:     --- label ---   (one line, mirrored dashes)
 *   Alternative: :::wa-divider params?\nlabel\n:::   (the body may be empty)
 *
 * Leading tokens (consumed from the left until the first non-token word):
 *   start, center, end   -> label-placement
 *   horizontal, vertical -> orientation
 *   icon:name            -> `<wa-icon name="name">` before the label
 * The rest of the line is the label, rendered as inline Markdown. To start a
 * label with one of those words, use the alternative syntax.
 *
 * A plain `---` (and `--- ---`) is left alone and stays an `<hr>`. So is a line
 * made only of `|`, `:`, `-` and whitespace (e.g. a pipe-less GFM table
 * separator such as `--- | ---`).
 *
 * Runs first in the pipeline (with the stepper) so a divider can sit inside any
 * container body.
 */
export const DIVIDER_ATTRIBUTES: AttributeSchema = {
  orientation: ['horizontal', 'vertical'],
  label_placement: ['start', 'center', 'end'],
};

// Content slot: emits `<wa-icon name="...">` with no slot attribute.
const ICON_SLOTS: SlotConfig = {
  default: 'content',
  slots: ['content'],
  slotMap: { content: 'content' },
};

// Ruby: /^---[ \t]+(\S[^\n]*?)[ \t]+---[ \t]*$/  and
//       /^:::wa-divider[ \t]*([^\n]*)\n(?:(.*?)\n)?:::[ \t]*$/m
// Ruby's `$` is "before \n or at end of string"; `(?![^\n])` is the exact JS
// equivalent (JS's multiline `$` would also stop before a `\r`).
const PRIMARY_REGEX = /^---[ \t]+(\S[^\n]*?)[ \t]+---[ \t]*(?![^\n])/gm;
const ALTERNATIVE_REGEX = /^:::wa-divider[ \t]*([^\n]*)\n(?:([\s\S]*?)\n)?:::[ \t]*(?![^\n])/gm;
const TABLE_SEPARATOR_REGEX = /^[|:\- \t\r\f\v]*$/;

export function transform(content: string): string {
  const primary = content.replace(PRIMARY_REGEX, (match: string, inner: string): string => {
    if (TABLE_SEPARATOR_REGEX.test(inner)) return match;
    const [lead, label] = splitLeadingTokens(inner);
    return buildHtml(lead, label);
  });

  return primary.replace(
    ALTERNATIVE_REGEX,
    (_match: string, paramsString: string, body: string | undefined): string =>
      buildHtml(paramsString, (body ?? '').trim()),
  );
}

/**
 * Degrade to a thematic break followed by the label as its own paragraph (icon
 * dropped). The leading blank line stops `---` from turning a preceding
 * paragraph line into a setext heading.
 */
export function renderAsMarkdown(content: string): string {
  const primary = content.replace(PRIMARY_REGEX, (match: string, inner: string): string => {
    if (TABLE_SEPARATOR_REGEX.test(inner)) return match;
    const [, label] = splitLeadingTokens(inner);
    return markdownBreak(label);
  });

  return primary.replace(
    ALTERNATIVE_REGEX,
    (_match: string, _paramsString: string, body: string | undefined): string =>
      markdownBreak((body ?? '').trim()),
  );
}

// Consume leading placement/orientation/icon tokens; the rest is the label.
function splitLeadingTokens(inner: string): [string, string] {
  const tokens = inner.trim().split(/\s+/);
  const lead: string[] = [];
  while (tokens.length > 0 && isLeadingToken(tokens[0]!)) lead.push(tokens.shift()!);
  return [lead.join(' '), tokens.join(' ')];
}

function isLeadingToken(token: string): boolean {
  return (
    token.startsWith('icon:') ||
    Object.values(DIVIDER_ATTRIBUTES).some((values) => values.includes(token))
  );
}

function buildHtml(paramsString: string, label: string): string {
  const attributes = parseAttributes(paramsString, DIVIDER_ATTRIBUTES);
  const iconResult = parseIconSlots(paramsString, ICON_SLOTS);

  const attrParts: string[] = [];
  if (attributes.orientation) attrParts.push(`orientation="${attributes.orientation}"`);
  if (attributes.label_placement) attrParts.push(`label-placement="${attributes.label_placement}"`);
  const attrsString = attrParts.length === 0 ? '' : ` ${attrParts.join(' ')}`;

  const iconHtml = iconsToHtml(iconResult.icons, ICON_SLOTS.slotMap);
  const labelHtml = renderInline(label);
  const separator = iconHtml !== '' && labelHtml !== '' ? ' ' : '';

  return `<wa-divider${attrsString}>${iconHtml}${separator}${labelHtml}</wa-divider>`;
}

// Inline Markdown: render, then drop the wrapping <p> (the badge idiom).
function renderInline(text: string): string {
  if (text === '') return '';
  return renderMarkdown(text)
    .trim()
    .replace(/^<p>([\s\S]*)<\/p>$/, (_m, inner: string) => inner);
}

function markdownBreak(label: string): string {
  return label === '' ? '\n---' : `\n---\n\n${label}\n`;
}
