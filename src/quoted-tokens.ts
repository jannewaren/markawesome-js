/**
 * Whitespace tokenization that keeps `key:"…"` / `key:'…'` (spaces included)
 * together as one token, plus the matching unquote. Shared by the `[[[ … ]]]`
 * transformers (date, counter, number ticker). Mirrors Ruby's
 * `Markawesome::QuotedTokens`.
 */
const TOKEN_REGEX = /[a-z-]+:"[^"]*"|[a-z-]+:'[^']*'|\S+/g;
const QUOTED_REGEX = /^"([^"]*)"$|^'([^']*)'$/;

export function splitQuotedTokens(input: string | undefined): string[] {
  return (input ?? '').match(TOKEN_REGEX) ?? [];
}

/** Strip one pair of matching surrounding quotes ("…" or '…'), if present. */
export function unquote(value: string): string {
  const m = QUOTED_REGEX.exec(value);
  return m ? (m[1] ?? m[2] ?? '') : value;
}
