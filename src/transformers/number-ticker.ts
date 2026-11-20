import { splitQuotedTokens, unquote } from '../quoted-tokens.js';
import { applyPatterns, escapeHtml, type Pattern } from './base.js';

/**
 * Transforms a number in the `[[[ … ]]]` syntax into a `<wa-number-ticker>`,
 * which counts up to the value when it scrolls into view and formats it with
 * Intl.NumberFormat.
 *   Inline (primary):    [[[ <number> <tokens> ]]]
 *   Block (alternative): :::wa-number-ticker <number> <tokens>\n:::
 *
 * The first token must be a number (-?digits, optional .digits, optional %). An
 * ISO date never matches, so dates still reach the date transformer, which runs
 * right after this one.
 *
 * `87%` means type="percent" value="0.87": the decimal point is shifted two
 * places textually (no floats). A bare number plus a `percent` token is
 * type="percent" with the value as written.
 *
 * Tokens (later tokens win): `currency:XXX` (-> type="currency", upcased),
 * `percent`/`decimal` (-> type), `display:` (-> currency-display), `from:N`
 * (-> start-value), `duration:MS`, `delay:MS`, `easing:VALUE`, `eager`,
 * `no-grouping` (-> without-grouping), `decimals:N` (0–100, -> minimum- and
 * maximum-fraction-digits), `lang:`/`locale:`.
 *
 * Byte-for-byte mirror of the Ruby `NumberTickerTransformer`.
 */
export const TICKER_TYPES = ['currency', 'decimal', 'percent'];
export const CURRENCY_DISPLAYS = ['symbol', 'narrowSymbol', 'code', 'name'];

const NUMBER = '-?\\d+(?:\\.\\d+)?%?';
const INLINE_REGEX = new RegExp(
  `\\[\\[\\[[ \\t]*(${NUMBER})(?:[ \\t]+([^\\]\\r\\n]*?))?[ \\t]*\\]\\]\\]`,
  'g',
);
const ALTERNATIVE_REGEX = new RegExp(
  `^:::wa-number-ticker[ \\t]+(${NUMBER})(?:[ \\t]+([^\\n]*?))?[ \\t]*\\n:::$`,
  'gm',
);

const PLAIN_NUMBER_REGEX = /^-?\d+(?:\.\d+)?$/;
const INTEGER_REGEX = /^\d+$/;

// Deterministic emission order (required for byte-for-byte parity).
const ORDER = [
  'value',
  'start-value',
  'duration',
  'delay',
  'easing',
  'eager',
  'type',
  'without-grouping',
  'currency',
  'currency-display',
  'minimum-fraction-digits',
  'maximum-fraction-digits',
  'lang',
];

type Attrs = Map<string, string | true>;

export function transform(content: string): string {
  const patterns: Pattern[] = [INLINE_REGEX, ALTERNATIVE_REGEX].map((regex) => ({
    regex,
    handler: (captures) => buildTicker(captures[0] ?? '', captures[1]),
  }));
  return applyPatterns(content, patterns);
}

/** Plain-Markdown degrade: the number as written, plus the currency code. */
export function renderAsMarkdown(content: string): string {
  const patterns: Pattern[] = [INLINE_REGEX, ALTERNATIVE_REGEX].map((regex) => ({
    regex,
    handler: (captures) => plainNumber(captures[0] ?? '', captures[1]),
  }));
  return applyPatterns(content, patterns);
}

function buildTicker(number: string, tokenString: string | undefined): string {
  const attrs: Attrs = new Map();
  if (number.endsWith('%')) {
    attrs.set('value', shiftPercent(number.slice(0, -1)));
    attrs.set('type', 'percent');
  } else {
    attrs.set('value', number);
  }
  for (const token of splitQuotedTokens(tokenString)) applyToken(token, attrs);
  if (attrs.get('type') === 'decimal') attrs.delete('type');

  const parts: string[] = [];
  for (const key of ORDER) {
    const value = attrs.get(key);
    if (value === undefined) continue;
    parts.push(value === true ? key : `${key}="${escapeHtml(value)}"`);
  }
  return `<wa-number-ticker ${parts.join(' ')}></wa-number-ticker>`;
}

function applyToken(token: string, attrs: Attrs): void {
  if (token === 'eager') attrs.set('eager', true);
  else if (token === 'no-grouping') attrs.set('without-grouping', true);
  else if (token === 'percent' || token === 'decimal') attrs.set('type', token);
  else {
    const m = /^([a-z-]+):(.+)$/.exec(token);
    if (m) applyOption(m[1]!, unquote(m[2]!), attrs);
  }
}

function applyOption(key: string, value: string, attrs: Attrs): void {
  switch (key) {
    case 'currency':
      if (/^[A-Za-z]{3}$/.test(value)) {
        attrs.set('currency', value.toUpperCase());
        attrs.set('type', 'currency');
      }
      break;
    case 'display':
      if (CURRENCY_DISPLAYS.includes(value)) attrs.set('currency-display', value);
      break;
    case 'from':
      if (PLAIN_NUMBER_REGEX.test(value)) attrs.set('start-value', value);
      break;
    case 'duration':
    case 'delay':
      if (INTEGER_REGEX.test(value)) attrs.set(key, value);
      break;
    case 'easing':
      attrs.set('easing', value);
      break;
    case 'decimals':
      if (INTEGER_REGEX.test(value) && parseInt(value, 10) <= 100) {
        const digits = String(parseInt(value, 10));
        attrs.set('minimum-fraction-digits', digits);
        attrs.set('maximum-fraction-digits', digits);
      }
      break;
    case 'lang':
    case 'locale':
      attrs.set('lang', value);
      break;
  }
}

/**
 * Divide a decimal string by 100 by moving the point two places left,
 * textually: "87" -> "0.87", "12.5" -> "0.125", "150" -> "1.5", "5" -> "0.05".
 */
export function shiftPercent(number: string): string {
  const negative = number.startsWith('-');
  const [intPart = '', fracPart = ''] = (negative ? number.slice(1) : number).split('.');
  let digits = `${intPart}${fracPart}`;
  let point = intPart.length - 2;
  if (point < 1) {
    digits = '0'.repeat(1 - point) + digits;
    point = 1;
  }
  const whole = digits.slice(0, point).replace(/^0+(?=\d)/, '');
  const fraction = digits.slice(point).replace(/0+$/, '');
  const result = fraction === '' ? whole : `${whole}.${fraction}`;
  return negative && result !== '0' ? `-${result}` : result;
}

function plainNumber(number: string, tokenString: string | undefined): string {
  let currency: string | null = null;
  for (const token of splitQuotedTokens(tokenString)) {
    const m = /^currency:([A-Za-z]{3})$/.exec(token);
    if (m) currency = m[1]!.toUpperCase();
  }
  return currency !== null ? `${number} ${currency}` : number;
}
