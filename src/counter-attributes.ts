import { escapeHtml } from './transformers/base.js';
import { unquote } from './quoted-tokens.js';

/**
 * `<wa-counter>` option vocabulary and attribute builder, used by the date
 * transformer's counter mode (`[[[ <date> countdown|countup … ]]]` and
 * `:::wa-counter`). Byte-for-byte mirror of Ruby's
 * `Markawesome::CounterAttributes`.
 *
 * Tokens (later tokens win):
 *   countdown/down, countup/up -> direction (down is the default, never emitted)
 *   largest:UNIT, smallest:UNIT -> largest-unit / smallest-unit (invalid dropped)
 *   format:short|narrow        -> format (long is the default, never emitted)
 *   no-labels                  -> without-labels
 *   delimiter:"…", label:"…"   -> delimiter / label
 *   lang:/locale:              -> lang
 *   finished:"…"               -> <span slot="finished">…</span>
 */
export const COUNTER_DIRECTIONS = ['down', 'up'];
export const COUNTER_FORMATS = ['long', 'short', 'narrow'];
export const COUNTER_UNITS = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];

// Deterministic emission order (required for byte-for-byte parity).
const ORDER = [
  'date',
  'direction',
  'largest-unit',
  'smallest-unit',
  'format',
  'without-labels',
  'delimiter',
  'label',
  'lang',
];

type Attrs = Map<string, string | true>;

/** Returns [attribute parts, inner HTML]. */
export function buildCounter(date: string | null, tokens: string[]): [string[], string] {
  const { attrs, finished } = parseCounter(tokens);
  if (date !== null) attrs.set('date', date);

  const parts: string[] = [];
  for (const key of ORDER) {
    const value = attrs.get(key);
    if (value === undefined) continue;
    parts.push(value === true ? key : `${key}="${escapeHtml(value)}"`);
  }
  const inner = finished !== null ? `<span slot="finished">${escapeHtml(finished)}</span>` : '';
  return [parts, inner];
}

function parseCounter(tokens: string[]): { attrs: Attrs; finished: string | null } {
  const attrs: Attrs = new Map();
  let finished: string | null = null;
  for (const token of tokens) {
    if (token === 'up' || token === 'countup') attrs.set('direction', 'up');
    else if (token === 'down' || token === 'countdown') attrs.delete('direction');
    else if (token === 'no-labels') attrs.set('without-labels', true);
    else {
      const m = /^([a-z-]+):(.+)$/.exec(token);
      if (!m) continue;
      finished = applyOption(m[1]!, unquote(m[2]!), attrs) ?? finished;
    }
  }
  return { attrs, finished };
}

// Applies one key:value option; returns the text for `finished`, else null.
function applyOption(key: string, value: string, attrs: Attrs): string | null {
  switch (key) {
    case 'largest':
    case 'smallest':
      if (COUNTER_UNITS.includes(value)) attrs.set(`${key}-unit`, value);
      break;
    case 'format':
      if (COUNTER_FORMATS.includes(value)) {
        if (value === 'long') attrs.delete('format');
        else attrs.set('format', value);
      }
      break;
    case 'delimiter':
    case 'label':
      attrs.set(key, value);
      break;
    case 'lang':
    case 'locale':
      attrs.set('lang', value);
      break;
    case 'finished':
      return value;
  }
  return null;
}
