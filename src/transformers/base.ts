/**
 * Shared regex-pattern machinery for the component transformers, mirroring the
 * Ruby `BaseTransformer`.
 *
 * Ruby <-> JS regex translation rules baked into the transformers:
 *   - Ruby `gsub` is global              -> JS regexes carry the `g` flag.
 *   - Ruby `^`/`$` are always line-anchored -> JS regexes carry the `m` flag
 *     wherever those anchors are used.
 *   - Ruby `/m` (DOTALL) makes `.` span newlines. We DON'T add the JS `s` flag
 *     globally; instead each newline-spanning body capture is written as
 *     `[\s\S]*?`, while single-line param captures stay `.*?` (which in JS,
 *     without `s`, behaves like `[^\n]*?`).
 */
import { createHash } from 'node:crypto';

/** A captured group value (may be `undefined` for optional groups). */
export type Capture = string | undefined;

/** Receives the ordered capture groups (group 0 excluded) and the full match. */
export type PatternHandler = (captures: Capture[], fullMatch: string) => string;

export interface Pattern {
  /** Must be constructed with the global (`g`) flag. */
  regex: RegExp;
  handler: PatternHandler;
}

/**
 * Apply each pattern's regex globally, replacing matches with the handler's
 * return value. Mirrors Ruby's `apply_multiple_patterns`.
 */
export function applyPatterns(content: string, patterns: Pattern[]): string {
  let result = content;
  for (const { regex, handler } of patterns) {
    result = result.replace(regex, (...args: unknown[]): string => {
      const fullMatch = args[0] as string;
      // String.replace callback args: (match, p1, …, pN, offset, string[, groups]).
      // None of the ported regexes use named groups, so the last two args are
      // always `offset` (number) and `string`. Everything between index 1 and
      // there are the numbered capture groups, matching Ruby's MatchData#captures.
      const captures = args.slice(1, args.length - 2) as Capture[];
      return handler(captures, fullMatch);
    });
  }
  return result;
}

/** The transform callback receives the capture groups as positional arguments. */
export type TransformProc = (...captures: Capture[]) => string;

/**
 * Build primary + alternative syntax patterns that share one transform proc,
 * mirroring Ruby's `dual_syntax_patterns`.
 */
export function dualSyntaxPatterns(
  primaryRegex: RegExp,
  alternativeRegex: RegExp,
  transformProc: TransformProc,
): Pattern[] {
  const make = (regex: RegExp): Pattern => ({
    regex,
    handler: (captures) => transformProc(...captures),
  });
  return [make(primaryRegex), make(alternativeRegex)];
}

/**
 * First 8 hex chars of the MD5 of `input`, matching Ruby's
 * `Digest::MD5.hexdigest(str)[0..7]`. Byte-identical for identical UTF-8 input.
 */
export function md5Hex8(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex').slice(0, 8);
}

/**
 * Escape the five significant HTML characters. Matches the escape set used by
 * the Ruby dialog/popover/tooltip/icon/accordion transformers (order matters:
 * `&` first so existing entities aren't double-escaped).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
