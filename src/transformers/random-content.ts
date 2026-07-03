import { parseAttributes, type AttributeSchema } from '../attribute-parser.js';
import { renderMarkdown } from '../markdown.js';
import { applyPatterns, dualSyntaxPatterns } from './base.js';

/**
 * Transforms random-content syntax into Web Awesome's experimental
 * `<wa-random-content>` element, which shows one or more of its direct element
 * children at random (optionally rotating them) and hides the rest — all in
 * WA's own runtime, so the author writes zero JavaScript. A byte-for-byte
 * mirror of the Ruby `RandomContentTransformer`.
 *   Primary:     ......params\noption\n>>>\noption\n......
 *   Alternative: :::wa-random-content params\n…>>>…\n:::
 *
 * Each option (split on a `>>>` line) has its rendered Markdown wrapped in a
 * single `<div>` so WA sees exactly one selectable element child per option.
 * The `>>>` separator is the SHARED glyph already used inside
 * details/dialog/popover/tooltip; it only acts as an item separator *inside* a
 * `......`/`:::wa-random-content` block. Runs last in the pipeline (after tree).
 *
 * Ruby→JS regex translation follows the documented rules (see base.ts): the
 * `/m` DOTALL body `(.*?)` becomes `([\s\S]*?)`; the single-line param capture
 * `([^\n]*)` is unchanged; `gm` flags are added. Deliberately NO `\s*` after
 * the alt fence (unlike carousel): with an unstructured body a greedy `\s*`
 * would swallow the first newline and capture the first option line as params.
 */
const MODE_VALUES = ['unique', 'random', 'sequence'];
const ANIMATION_VALUES = ['none', 'fade', 'fade-up', 'fade-down', 'fade-left', 'fade-right'];

const COMPONENT_ATTRIBUTES: AttributeSchema = {
  mode: MODE_VALUES,
  animation: ANIMATION_VALUES,
  autoplay: ['autoplay'],
};

const PRIMARY_REGEX = /^\.{6}([^\n]*)\n([\s\S]*?)\n\.{6}/gm;
const ALTERNATIVE_REGEX = /^:::wa-random-content([^\n]*)\n([\s\S]*?)\n:::/gm;
const ITEM_SEPARATOR = /^>>>$/m;

type ParsedParams = Record<string, string | true>;

export function transform(content: string): string {
  const transformProc = (params = '', itemsBlock = ''): string =>
    buildHtml(extractItems(itemsBlock), parseParams(params));
  return applyPatterns(content, dualSyntaxPatterns(PRIMARY_REGEX, ALTERNATIVE_REGEX, transformProc));
}

function extractItems(itemsBlock: string): string[] {
  return itemsBlock.split(ITEM_SEPARATOR).map((item) => item.trim());
}

function parseParams(params: string): ParsedParams {
  const result: ParsedParams = {};
  if (!params || params.trim() === '') return result;

  // Bare enum/boolean tokens via the shared attribute parser (rightmost-wins).
  const attributes = parseAttributes(params, COMPONENT_ATTRIBUTES);
  if (attributes['mode']) result['mode'] = attributes['mode'];
  if (attributes['animation']) result['animation'] = attributes['animation'];
  if (attributes['autoplay']) result['autoplay'] = true;

  // Manual pass for key:value and bare-integer tokens.
  for (const token of params.trim().split(/\s+/)) mergeManualToken(result, token);

  return result;
}

// Fold a single space-separated token into the parsed attribute map:
// `mode:`/`animation:` (enum-validated), `items:` / bare integer, and
// `autoplay-interval:`. Anything else is ignored.
function mergeManualToken(result: ParsedParams, token: string): void {
  if (token.includes(':')) {
    const idx = token.indexOf(':');
    const key = token.slice(0, idx);
    const value = token.slice(idx + 1);
    switch (key) {
      case 'mode':
        if (MODE_VALUES.includes(value)) result['mode'] = value;
        break;
      case 'animation':
        if (ANIMATION_VALUES.includes(value)) result['animation'] = value;
        break;
      case 'items':
        result['items'] = value;
        break;
      case 'autoplay-interval':
        result['autoplay-interval'] = value;
        break;
    }
  } else if (/^\d+$/.test(token)) {
    result['items'] = token;
  }
}

function buildHtml(items: string[], params: ParsedParams): string {
  const attrString = buildAttributes(params);

  // Empty options are dropped — an empty rotating option would show nothing.
  // `.filter(i => i !== '')` matches Ruby's `reject(&:empty?)`: JS `split`
  // keeps the leading/trailing empties that Ruby drops. Keep the renderer's
  // trailing "\n" inside each <div> (no trim).
  const divs = items
    .filter((item) => item !== '')
    .map((item) => `<div>${renderMarkdown(item)}</div>`)
    .join('');

  return `<wa-random-content${attrString}>${divs}</wa-random-content>`;
}

// Fixed emission order for byte-parity: mode, items, animation, autoplay,
// autoplay-interval.
function buildAttributes(params: ParsedParams): string {
  const attrs: string[] = [];
  if (params['mode']) attrs.push(`mode="${params['mode'] as string}"`);
  if (params['items']) attrs.push(`items="${params['items'] as string}"`);
  if (params['animation']) attrs.push(`animation="${params['animation'] as string}"`);
  if (params['autoplay']) attrs.push('autoplay');
  if (params['autoplay-interval'])
    attrs.push(`autoplay-interval="${params['autoplay-interval'] as string}"`);
  return attrs.length === 0 ? '' : ` ${attrs.join(' ')}`;
}
