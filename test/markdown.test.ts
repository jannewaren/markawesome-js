import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/markdown.js';

/**
 * Unit tests for the internal markdown renderer, focused on the wa-block rule
 * (src/wa-block-rule.ts) that keeps nested block `<wa-*>` components from being
 * wrapped in a `<p>`. The behaviour mirrors Kramdown in the Ruby engine; the
 * end-to-end byte-parity is locked in test/parity-corpus.test.ts.
 */
describe('renderMarkdown — wa-block rule', () => {
  it('does not wrap a block-level <wa-*> component in a paragraph', () => {
    const body = '<wa-callout variant="success"><wa-icon slot="icon" name="check"></wa-icon><p>Body.</p>\n</wa-callout>';
    const out = renderMarkdown(body);
    expect(out).not.toMatch(/<p>\s*<wa-callout/);
    // Pass-through verbatim, terminated by a single newline (Kramdown parity).
    expect(out).toBe(`${body}\n`);
  });

  it('leaves an inline <wa-*> spliced into prose inside its paragraph', () => {
    const out = renderMarkdown('<wa-icon name="star"></wa-icon> see **this**');
    expect(out).toBe('<p><wa-icon name="star"></wa-icon> see <strong>this</strong></p>\n');
  });

  it('still wraps ordinary prose in a paragraph (rule does not fire)', () => {
    expect(renderMarkdown('Just **prose** here.')).toBe('<p>Just <strong>prose</strong> here.</p>\n');
  });

  it('counts only the same tag name so nested children do not mis-balance', () => {
    const body =
      '<wa-carousel><wa-carousel-item><p>One</p>\n</wa-carousel-item><wa-carousel-item><p>Two</p>\n</wa-carousel-item></wa-carousel>';
    const out = renderMarkdown(body);
    expect(out).not.toMatch(/<p>\s*<wa-carousel/);
    expect(out).toBe(`${body}\n`);
  });

  it('handles a self-closing block component without mis-balancing', () => {
    const out = renderMarkdown('<wa-divider></wa-divider>');
    expect(out).toBe('<wa-divider></wa-divider>\n');
  });
});
