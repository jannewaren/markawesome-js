import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import { waBlockRule } from './wa-block-rule.js';

/**
 * Internal markdown renderer used to convert the inner content of Web Awesome
 * components (callout bodies, card content, tab panels, …) to HTML.
 *
 * This mirrors the Ruby engine's `Kramdown::Document.new(content).to_html`. The
 * engine owns this renderer deliberately: inner rendering must be deterministic
 * and decoupled from whatever markdown processor the host site uses.
 *
 * Parity notes vs Kramdown:
 *   - `xhtmlOut: true` emits void elements as `<br />` / `<img … />`, matching
 *     Kramdown's output.
 *   - Typographer / smart quotes are intentionally OFF.
 *   - Headings receive auto-generated `id` attributes using Kramdown's exact
 *     `basic_generate_id` algorithm (see {@link kramdownSlug}). Duplicate ids
 *     within a single render get `-1`, `-2`, … suffixes, tracked per render
 *     (each render is a fresh "document", matching Kramdown).
 */
const md = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  breaks: false,
  linkify: false,
  typographer: false,
});

// Treat a block-level `<wa-*>` component as a pass-through HTML block, matching
// Kramdown: when a container body contains an already-transformed block
// component (e.g. a callout nested in an accordion item), don't wrap it in a
// `<p>`. See {@link waBlockRule}.
md.block.ruler.before('html_block', 'wa_block', waBlockRule, {
  alt: ['paragraph', 'reference', 'blockquote'],
});

/**
 * Replicate Kramdown's `Converter::Base#basic_generate_id`:
 *   1. strip leading non-letters
 *   2. keep only ASCII alphanumerics, spaces and hyphens
 *   3. spaces -> hyphens
 *   4. downcase
 */
export function kramdownSlug(text: string): string {
  let id = text.replace(/^[^a-zA-Z]+/, '');
  id = id.replace(/[^a-zA-Z0-9 -]/g, '');
  id = id.replace(/ /g, '-');
  return id.toLowerCase();
}

// Collect the plain-text content of a heading's inline token, ignoring markup
// (matches the text Kramdown feeds to its id generator).
function headingText(inline: Token | null): string {
  if (!inline || !inline.children) return inline?.content ?? '';
  let text = '';
  for (const child of inline.children) {
    if (child.type === 'text' || child.type === 'code_inline') {
      text += child.content;
    }
  }
  return text;
}

// Core rule: assign Kramdown-style ids to every heading, deduplicating within
// the current render via `env.usedIds`.
md.core.ruler.push('kramdown_heading_ids', (state) => {
  const env = state.env as { usedIds?: Record<string, number> };
  const usedIds: Record<string, number> = env.usedIds ?? (env.usedIds = {});
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token || token.type !== 'heading_open') continue;
    const inline = tokens[i + 1] ?? null;
    let base = kramdownSlug(headingText(inline));
    if (base === '') base = 'section';
    let id: string;
    if (Object.prototype.hasOwnProperty.call(usedIds, base)) {
      const next = (usedIds[base] ?? 0) + 1;
      usedIds[base] = next;
      id = `${base}-${next}`;
    } else {
      usedIds[base] = 0;
      id = base;
    }
    token.attrSet('id', id);
  }
});

/**
 * Convert markdown content to HTML, equivalent to the Ruby engine's
 * `markdown_to_html` helper. A fresh `env` per call resets heading-id
 * deduplication, matching Kramdown's per-document behaviour.
 */
export function renderMarkdown(content: string): string {
  return md.render(content, {});
}
