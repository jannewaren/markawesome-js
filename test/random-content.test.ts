import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/random-content.js';

describe('RandomContentTransformer.transform', () => {
  it('combined example (exact)', () => {
    expect(
      transform('......mode:random items:2 animation:fade\nA **testimonial** or tip\n>>>\nAnother option\n......'),
    ).toBe(
      '<wa-random-content mode="random" items="2" animation="fade">' +
        '<div><p>A <strong>testimonial</strong> or tip</p>\n</div>' +
        '<div><p>Another option</p>\n</div>' +
        '</wa-random-content>',
    );
  });

  it('alternative syntax with no params (exact)', () => {
    expect(transform(':::wa-random-content\nA\n>>>\nB\n:::')).toBe(
      '<wa-random-content><div><p>A</p>\n</div><div><p>B</p>\n</div></wa-random-content>',
    );
  });

  it('bare enums + autoplay + interval, emitted in fixed order (exact)', () => {
    expect(transform('......sequence fade autoplay autoplay-interval:3000\nA\n>>>\nB\n......')).toBe(
      '<wa-random-content mode="sequence" animation="fade" autoplay autoplay-interval="3000">' +
        '<div><p>A</p>\n</div><div><p>B</p>\n</div></wa-random-content>',
    );
  });

  it('items:N colon form', () => {
    expect(transform('......items:2\nA\n......')).toContain('<wa-random-content items="2">');
  });

  it('bare integer maps to items', () => {
    expect(transform('......3\nA\n......')).toContain('<wa-random-content items="3">');
  });

  it('single option with no separator (exact)', () => {
    expect(transform('......\nJust one option\n......')).toBe(
      '<wa-random-content><div><p>Just one option</p>\n</div></wa-random-content>',
    );
  });

  it('silently ignores an invalid enum value', () => {
    const result = transform('......mode:bogus\nA\n>>>\nB\n......');
    expect(result).toContain('<wa-random-content><div>');
    expect(result).not.toContain('bogus');
  });

  it('multi-paragraph option renders as a single <div> with two paragraphs', () => {
    // Note: markdown-it collapses the blank line between sibling blocks (a
    // documented, render-identical divergence from Kramdown's `\n\n`), so this
    // asserts the engine-native single-`\n` form rather than a parity value.
    const result = transform('......\nPara one\n\nPara two\n>>>\nB\n......');
    expect(result).toContain('<div><p>Para one</p>\n<p>Para two</p>\n</div>');
    expect((result.match(/<div>/g) ?? []).length).toBe(2);
  });

  it('drops an empty option', () => {
    expect(transform('......\nA\n>>>\n>>>\nB\n......')).toBe(
      '<wa-random-content><div><p>A</p>\n</div><div><p>B</p>\n</div></wa-random-content>',
    );
  });

  it('leaves an unclosed fence untransformed', () => {
    const input = '......\nA\n>>>\nB';
    expect(transform(input)).toBe(input);
  });

  it('leaves a stray >>> outside a fence inert', () => {
    const input = 'Some text\n>>>\nMore text';
    expect(transform(input)).toBe(input);
  });
});

describe('RandomContentTransformer.renderAsMarkdown', () => {
  it('flattens options into blank-line-separated blocks and drops the fences', () => {
    const md = '......mode:random items:2\nFirst **option**\n>>>\nSecond option\n......';
    const result = renderAsMarkdown(md);
    expect(result).toContain('First **option**');
    expect(result).toContain('Second option');
    expect(result).toContain('First **option**\n\nSecond option');
    expect(result).not.toContain('......');
    expect(result).not.toContain(':::');
    expect(result).not.toContain('>>>');
  });

  it('degrades the alternative syntax identically', () => {
    const md = ':::wa-random-content\nFirst option\n>>>\nSecond option\n:::';
    expect(renderAsMarkdown(md)).toBe('First option\n\nSecond option');
  });

  it('drops empty options', () => {
    expect(renderAsMarkdown('......\nA\n>>>\n>>>\nB\n......')).toBe('A\n\nB');
  });
});
