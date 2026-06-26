import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/popover.js';

describe('PopoverTransformer.transform', () => {
  it('basic block popover (exact, incl. MD5 id matching Ruby)', () => {
    const result = transform('&&&\nMore info\n>>>\nThis is the popover content.\n&&&');
    expect(result).toBe(
      [
        "<wa-button id='popover-50940489' appearance='plain'>More info</wa-button>",
        "<wa-popover for='popover-50940489' placement='top'>",
        '<p>This is the popover content.</p>',
        '',
        '</wa-popover>',
      ].join('\n'),
    );
  });

  it('inline popover (exact, link-styled trigger)', () => {
    const result = transform('&&&bottom Hover me >>> Tooltip-like content&&&');
    expect(result).toBe(
      "<button type='button' id='popover-3a6f4978' class='ma-popover-trigger' " +
        "style='background: none; border: none; padding: 0; color: inherit; text-decoration: underline; text-decoration-style: dotted; cursor: pointer; font: inherit;'>Hover me</button>" +
        "<wa-popover for='popover-3a6f4978' placement='bottom'>Tooltip-like content</wa-popover>",
    );
  });

  it('placement parameter', () => {
    expect(transform('&&&bottom\nInfo\n>>>\nContent\n&&&')).toContain("placement='bottom'");
  });

  it('without-arrow flag', () => {
    expect(transform('&&&without-arrow\nInfo\n>>>\nContent\n&&&')).toContain('without-arrow');
  });

  it('distance parameter', () => {
    expect(transform('&&&distance:10\nInfo\n>>>\nContent\n&&&')).toContain("distance='10'");
  });

  it('link trigger style renders a button, not wa-button', () => {
    const result = transform('&&&link\nInfo\n>>>\nContent\n&&&');
    expect(result).toContain("<button type='button' id='popover-");
    expect(result).not.toContain('<wa-button');
  });

  it('block content is markdown-rendered', () => {
    expect(transform('&&&\nInfo\n>>>\n[a link](https://example.com)\n&&&')).toContain(
      '<a href="https://example.com">a link</a>',
    );
  });

  it('disambiguates duplicate popovers within the same document', () => {
    const result = transform('&&&\nT\n>>>\nC\n&&&\n\n&&&\nT\n>>>\nC\n&&&');
    const ids = [...result.matchAll(/for='(popover-[^']+)'/g)].map((m) => m[1]);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[1]).toMatch(/-2$/);
  });
});
