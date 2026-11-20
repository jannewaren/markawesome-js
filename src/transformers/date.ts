import { buildCounter } from '../counter-attributes.js';
import { splitQuotedTokens } from '../quoted-tokens.js';
import { applyPatterns, escapeHtml, type Pattern } from './base.js';

/**
 * Transforms declarative timestamp syntax into Web Awesome's three date
 * components:
 *   <wa-format-date>   — an absolute, locale-formatted date ("June 26, 2026")
 *   <wa-relative-time> — a relative phrase ("3 days ago"), optionally ticking
 *   <wa-counter>       — a live countdown to / count up from a date
 *
 * Inline (primary):    [[[ <date> <tokens> ]]]
 * Block (alternative): :::wa-format-date <date> <tokens>  /  :::wa-relative-time …
 *                      /  :::wa-counter …, followed by a closing ::: (empty body)
 *
 * Byte-for-byte mirror of the Ruby `DateTransformer`. Mode: absolute
 * (<wa-format-date>) is the default; in the inline form a bare `countdown` /
 * `countup` token switches to <wa-counter>, else a bare `relative` token
 * switches to <wa-relative-time>; the block selector name picks the mode (a
 * counter counts down unless `up`/`countup`).
 *
 * Tokens are whitespace-separated, except that `key:"…"` / `key:'…'` keeps a
 * quoted value (spaces included) together — used by the counter's `finished:`,
 * `label:` and `delimiter:`.
 */

// Inline: content excludes `]`, non-greedy, multiple-per-line, single-line.
const INLINE_REGEX = /\[\[\[[ \t]*([^\]\r\n]+?)[ \t]*\]\]\]/g;
// Block: selector name picks the mode; an empty body, closed by `:::`.
const ALTERNATIVE_REGEX = /^:::wa-(format-date|relative-time|counter)[ \t]*([^\n]*)\n:::$/gm;

// A token is the date when it is an ISO 8601 date or datetime (datetimes use
// the `T` separator — a space would break whitespace tokenization).
const DATE_TOKEN_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

// style:/time: presets expand to Web Awesome's granular date/time attributes.
const STYLE_PRESETS: Record<string, Record<string, string>> = {
  short: { month: 'numeric', day: 'numeric', year: '2-digit' },
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
  full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
};

const TIME_PRESETS: Record<string, Record<string, string>> = {
  short: { hour: 'numeric', minute: 'numeric' },
  medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
  long: { hour: 'numeric', minute: 'numeric', second: 'numeric', 'time-zone-name': 'short' },
  full: { hour: 'numeric', minute: 'numeric', second: 'numeric', 'time-zone-name': 'long' },
};

// Granular key:value tokens passed through to the same-named WA attribute,
// validated against an allowed enum (invalid values dropped).
export const GRANULAR_ENUMS: Record<string, string[]> = {
  weekday: ['narrow', 'short', 'long'],
  era: ['narrow', 'short', 'long'],
  year: ['numeric', '2-digit'],
  month: ['numeric', '2-digit', 'narrow', 'short', 'long'],
  day: ['numeric', '2-digit'],
  hour: ['numeric', '2-digit'],
  minute: ['numeric', '2-digit'],
  second: ['numeric', '2-digit'],
  'hour-format': ['auto', '12', '24'],
  'time-zone-name': ['short', 'long'],
};

// Granular keys that count as an explicit date/time field — their presence (or
// a style:/time: preset) suppresses the style:long default.
const CONTENT_FIELDS = [
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'time-zone-name',
];

// Deterministic emission order (required for byte-for-byte parity).
const FORMAT_DATE_ORDER = [
  'date',
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'time-zone-name',
  'time-zone',
  'hour-format',
  'lang',
];

export const RELATIVE_FORMATS = ['long', 'short', 'narrow'];
export const RELATIVE_NUMERICS = ['auto', 'always'];

// Own-property check (not `in`) so a token like `style:constructor` can't reach
// an inherited prototype member — matching Ruby's `Hash#key?`.
const hasOwn = (obj: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, key);

type Mode = 'relative' | 'absolute' | 'counter';

// Bare tokens that switch the inline form to <wa-counter>; its options live in
// counter-attributes.ts.
const COUNTER_MODE_TOKENS = ['countdown', 'countup'];
const BLOCK_MODES: Record<string, Mode> = {
  'format-date': 'absolute',
  'relative-time': 'relative',
  counter: 'counter',
};

export function transform(content: string): string {
  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => renderTokens(captures[0] ?? '', null),
  };
  const alternativePattern: Pattern = {
    regex: ALTERNATIVE_REGEX,
    handler: (captures) => {
      return renderTokens(captures[1] ?? '', BLOCK_MODES[captures[0] ?? ''] ?? 'absolute');
    },
  };
  // Inline first to avoid conflicts with the block pattern.
  return applyPatterns(content, [inlinePattern, alternativePattern]);
}

/**
 * Plain-markdown degradation: there is no locale formatting in plain text, so
 * each timestamp degrades to its raw ISO date string (empty when omitted).
 */
export function renderAsMarkdown(content: string): string {
  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => extractDate(captures[0] ?? ''),
  };
  const alternativePattern: Pattern = {
    regex: ALTERNATIVE_REGEX,
    handler: (captures) => extractDate(captures[1] ?? ''),
  };
  return applyPatterns(content, [inlinePattern, alternativePattern]);
}

// Return the first date/datetime token (or '' when none is present).
function extractDate(tokenString: string): string {
  const tokens = splitQuotedTokens(tokenString);
  return tokens.find((t) => DATE_TOKEN_REGEX.test(t)) ?? '';
}

function renderTokens(tokenString: string, modeOverride: Mode | null): string {
  const date = splitDate(splitQuotedTokens(tokenString));
  const tokens = date.rest;
  switch (modeOverride ?? inlineMode(tokens)) {
    case 'counter':
      return buildElement('wa-counter', ...buildCounter(date.value, tokens));
    case 'relative':
      return buildRelativeTime(date.value, tokens);
    default:
      return buildFormatDate(date.value, tokens);
  }
}

function inlineMode(tokens: string[]): Mode {
  if (tokens.some((t) => COUNTER_MODE_TOKENS.includes(t))) return 'counter';
  return tokens.includes('relative') ? 'relative' : 'absolute';
}

// Pull the first date/datetime token out, leaving the option tokens.
function splitDate(tokens: string[]): { value: string | null; rest: string[] } {
  const index = tokens.findIndex((t) => DATE_TOKEN_REGEX.test(t));
  if (index === -1) return { value: null, rest: tokens };
  return {
    value: tokens[index] ?? null,
    rest: [...tokens.slice(0, index), ...tokens.slice(index + 1)],
  };
}

function buildFormatDate(date: string | null, tokens: string[]): string {
  const attrs: Record<string, string> = {};
  applyPresets(tokens, attrs);
  applyGranular(tokens, attrs);
  // A bare date (no style/time/granular field) defaults to style:long.
  if (!CONTENT_FIELDS.some((key) => hasOwn(attrs, key))) {
    Object.assign(attrs, STYLE_PRESETS.long);
  }
  if (date !== null) attrs.date = date;

  const parts: string[] = [];
  for (const key of FORMAT_DATE_ORDER) {
    if (hasOwn(attrs, key)) parts.push(`${key}="${escapeHtml(attrs[key]!)}"`);
  }
  return buildElement('wa-format-date', parts);
}

// Apply the rightmost valid style: and time: presets.
function applyPresets(tokens: string[], attrs: Record<string, string>): void {
  let style: string | undefined;
  let time: string | undefined;
  for (const token of tokens) {
    const sm = /^style:(.+)$/.exec(token);
    const tm = /^time:(.+)$/.exec(token);
    if (sm && hasOwn(STYLE_PRESETS, sm[1]!)) style = sm[1]!;
    else if (tm && hasOwn(TIME_PRESETS, tm[1]!)) time = tm[1]!;
  }
  if (style !== undefined) Object.assign(attrs, STYLE_PRESETS[style]!);
  if (time !== undefined) Object.assign(attrs, TIME_PRESETS[time]!);
}

// Apply granular enum keys (override presets) and free-string modifiers
// (time-zone, lang/locale). Later tokens win.
function applyGranular(tokens: string[], attrs: Record<string, string>): void {
  for (const token of tokens) {
    const m = /^([a-z-]+):(.+)$/.exec(token);
    if (!m) continue;
    const key = m[1]!;
    const value = m[2]!;
    if (hasOwn(GRANULAR_ENUMS, key) && GRANULAR_ENUMS[key]!.includes(value)) {
      attrs[key] = value;
    } else if (key === 'time-zone') {
      attrs['time-zone'] = value;
    } else if (key === 'lang' || key === 'locale') {
      attrs.lang = value;
    }
  }
}

interface RelativeOptions {
  format: string | undefined;
  numeric: string | undefined;
  sync: boolean;
  lang: string | undefined;
}

function buildRelativeTime(date: string | null, tokens: string[]): string {
  const opts = parseRelativeOptions(tokens);
  const parts: string[] = [];
  if (date !== null) parts.push(`date="${escapeHtml(date)}"`);
  if (opts.format && opts.format !== 'long') parts.push(`format="${opts.format}"`);
  if (opts.numeric && opts.numeric !== 'auto') parts.push(`numeric="${opts.numeric}"`);
  if (opts.sync) parts.push('sync');
  if (opts.lang) parts.push(`lang="${escapeHtml(opts.lang)}"`);
  return buildElement('wa-relative-time', parts);
}

function parseRelativeOptions(tokens: string[]): RelativeOptions {
  const opts: RelativeOptions = {
    format: undefined,
    numeric: undefined,
    sync: false,
    lang: undefined,
  };
  for (const token of tokens) {
    if (token === 'sync') {
      opts.sync = true;
      continue;
    }
    const fm = /^format:(.+)$/.exec(token);
    const nm = /^numeric:(.+)$/.exec(token);
    const lm = /^(?:lang|locale):(.+)$/.exec(token);
    if (fm && RELATIVE_FORMATS.includes(fm[1]!)) opts.format = fm[1]!;
    else if (nm && RELATIVE_NUMERICS.includes(nm[1]!)) opts.numeric = nm[1]!;
    else if (lm) opts.lang = lm[1]!;
  }
  return opts;
}

function buildElement(tag: string, parts: string[], inner = ''): string {
  if (parts.length === 0) return `<${tag}>${inner}</${tag}>`;
  return `<${tag} ${parts.join(' ')}>${inner}</${tag}>`;
}
