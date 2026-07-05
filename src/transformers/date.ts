import { applyPatterns, escapeHtml, type Pattern } from './base.js';

/**
 * Transforms declarative timestamp syntax into Web Awesome's two timestamp
 * components:
 *   <wa-format-date>   — an absolute, locale-formatted date ("June 26, 2026")
 *   <wa-relative-time> — a relative phrase ("3 days ago"), optionally ticking
 *
 * Inline (primary):    [[[ <date> <tokens> ]]]
 * Block (alternative): :::wa-format-date <date> <tokens>  /  :::wa-relative-time …
 *                      followed by a closing ::: (empty body)
 *
 * Byte-for-byte mirror of the Ruby `DateTransformer`. Mode: absolute
 * (<wa-format-date>) is the default; a bare `relative` token in the inline form
 * switches to <wa-relative-time>; the block selector name picks the mode.
 */

// Inline: content excludes `]`, non-greedy, multiple-per-line, single-line.
const INLINE_REGEX = /\[\[\[[ \t]*([^\]\r\n]+?)[ \t]*\]\]\]/g;
// Block: selector name picks the mode; an empty body, closed by `:::`.
const ALTERNATIVE_REGEX = /^:::wa-(format-date|relative-time)[ \t]*([^\n]*)\n:::$/gm;

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

type Mode = 'relative' | 'absolute';

export function transform(content: string): string {
  const inlinePattern: Pattern = {
    regex: INLINE_REGEX,
    handler: (captures) => renderTokens(captures[0] ?? '', null),
  };
  const alternativePattern: Pattern = {
    regex: ALTERNATIVE_REGEX,
    handler: (captures) => {
      const mode: Mode = captures[0] === 'relative-time' ? 'relative' : 'absolute';
      return renderTokens(captures[1] ?? '', mode);
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
  const trimmed = tokenString.trim();
  const tokens = trimmed === '' ? [] : trimmed.split(/\s+/);
  return tokens.find((t) => DATE_TOKEN_REGEX.test(t)) ?? '';
}

function renderTokens(tokenString: string, modeOverride: Mode | null): string {
  const trimmed = tokenString.trim();
  let tokens = trimmed === '' ? [] : trimmed.split(/\s+/);
  const date = splitDate(tokens);
  tokens = date.rest;
  const mode = modeOverride ?? (tokens.includes('relative') ? 'relative' : 'absolute');

  return mode === 'relative'
    ? buildRelativeTime(date.value, tokens)
    : buildFormatDate(date.value, tokens);
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

function buildElement(tag: string, parts: string[]): string {
  if (parts.length === 0) return `<${tag}></${tag}>`;
  return `<${tag} ${parts.join(' ')}></${tag}>`;
}
