import type MarkdownIt from 'markdown-it';

// `StateBlock` isn't reachable as a named/namespace import through
// @types/markdown-it's `export =` re-export, so derive it from the public ruler
// API (the block-rule callback's first parameter).
type RuleBlock = Parameters<MarkdownIt['block']['ruler']['before']>[2];
type StateBlock = Parameters<RuleBlock>[0];

/**
 * markdown-it block rule that recognises a block-level `<wa-*>` component as a
 * pass-through HTML block, so the internal renderer never wraps it in a `<p>`.
 *
 * Why this exists — Ruby parity. The engine renders the *inner* body of a
 * container component (accordion item, tab panel, card, …) to HTML with
 * {@link renderMarkdown}. When that body itself contains an already-transformed
 * block component (e.g. a `:::` callout inside a `//////` accordion item),
 * markdown-it does not recognise `<wa-callout>` as an HTML block — it isn't on
 * markdown-it's hard-coded tag list and the component body sits right after the
 * opening tag — so it wraps the whole component in a `<p>`. The Ruby engine's
 * Kramdown leaves such a block untouched, so without this rule the two engines
 * diverge (`<p><wa-callout>…</wa-callout></p>` vs `<wa-callout>…</wa-callout>`)
 * and, in the browser, the stray `<p>` is auto-closed *through* the custom
 * element, ejecting the nested component's body so it renders empty.
 *
 * Registered `before('html_block')` with
 * `alt: ['paragraph', 'reference', 'blockquote']` so it can interrupt a
 * paragraph (a nested block component glued to a preceding prose line with no
 * blank line in between would otherwise be absorbed).
 */
export function waBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  // markdown-it guarantees these line-indexed arrays cover [0, lineMax]; the
  // `!` asserts the always-in-bounds access under `noUncheckedIndexedAccess`.
  const pos = state.bMarks[startLine]! + state.tShift[startLine]!;
  const max = state.eMarks[startLine]!;

  // Guards mirror native html_block.
  // Indented >= 4 spaces → indented code block, not an HTML block.
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false;
  // Raw HTML must be enabled (the internal renderer sets `html: true`).
  if (!state.md.options.html) return false;
  // Must start with '<'.
  if (state.src.charCodeAt(pos) !== 0x3c /* < */) return false;

  // Fire only on an *opening* `<wa-NAME …>` tag. The `(?=[\s/>])` lookahead
  // stops `wa-tab` from matching `wa-tab-group`/`wa-tab-panel`, and
  // `wa-carousel` from `wa-carousel-item`.
  const firstLine = state.src.slice(pos, max);
  const open = /^<(wa-[a-z0-9-]+)(?=[\s/>])/.exec(firstLine);
  if (!open) return false;
  const tag = open[1];

  // Matches an opening, closing, or self-closing tag of *this* name only.
  // `(?=[\s/>])` after the name keeps `wa-tab` from matching `wa-tab-group`.
  // The lazy `[^>]*?` lets a trailing `/` fall into group 2 so self-closing
  // tags (`<wa-icon …/>`) are detected and counted as net-zero. Counting only
  // the same tag name means void `<img>` and child components like
  // `<wa-carousel-item>` never mis-balance the depth.
  const tagRe = new RegExp(`<(/?)${tag}(?=[\\s/>])[^>]*?(/?)>`, 'g');

  let depth = 0;
  let closeLine = -1;
  let trailing = '';

  for (let line = startLine; line < endLine; line++) {
    const lineStart = line === startLine ? pos : state.bMarks[line]!;
    const lineText = state.src.slice(lineStart, state.eMarks[line]!);
    tagRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(lineText)) !== null) {
      if (m[1] === '/') {
        depth--; // closing tag
      } else if (m[2] === '/') {
        // self-closing tag: opens and closes at once, net zero
      } else {
        depth++; // opening tag
      }
      if (depth === 0) {
        // Found the close that balances the opening. Remember what follows it
        // on this line, so the first-line inline bail below can inspect it.
        trailing = lineText.slice(m.index + m[0].length);
        closeLine = line;
        break;
      }
    }
    if (closeLine !== -1) break;
  }

  // Never closed / malformed → defer to the native rules (graceful).
  if (closeLine === -1) return false;

  // Inline bail: the element re-balanced on its *first* line and there is
  // non-whitespace content after its close. That's an inline component spliced
  // into prose (e.g. `<wa-icon …></wa-icon> see this`), which must stay a
  // paragraph so the surrounding markdown still renders.
  if (closeLine === startLine && /\S/.test(trailing)) return false;

  // It's a block component. In silent mode (interrupt probe) just report that
  // we can take this line; don't emit a token or advance.
  if (silent) return true;

  const nextLine = closeLine + 1;
  const token = state.push('html_block', '', 0);
  token.map = [startLine, nextLine];
  let content = state.getLines(startLine, nextLine, state.blkIndent, true);
  // Kramdown always terminates a block-level HTML element with a newline. The
  // internal renderer is fed trimmed component bodies, so when the component is
  // the body's final block, `getLines` returns it without a trailing LF. Restore
  // exactly one (only when missing — a block followed by more content already
  // keeps its LF) to stay byte-identical to the Ruby engine.
  if (!content.endsWith('\n')) content += '\n';
  token.content = content;
  state.line = nextLine;
  return true;
}
