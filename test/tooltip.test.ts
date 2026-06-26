import { describe, it, expect } from 'vitest';
import { transform } from '../src/transformers/tooltip.js';

describe('TooltipTransformer.transform', () => {
  it('inline tooltip (exact, incl. MD5 id matching Ruby)', () => {
    const result = transform('(((API >>> Application Programming Interface)))');
    expect(result).toBe(
      '<span id="tooltip-62ab914f" tabindex="0" class="ma-tooltip-anchor" ' +
        'style="text-decoration: underline dotted; cursor: help;">API</span>' +
        '<wa-tooltip for="tooltip-62ab914f" placement="top">Application Programming Interface</wa-tooltip>',
    );
  });

  it('block tooltip (exact, incl. MD5 id matching Ruby)', () => {
    const result = transform(
      ':::wa-tooltip bottom\nREST\n>>>\nRepresentational State Transfer\n:::',
    );
    expect(result).toBe(
      '<span id="tooltip-d8acae7a" tabindex="0" class="ma-tooltip-anchor" ' +
        'style="text-decoration: underline dotted; cursor: help;">REST</span>' +
        '<wa-tooltip for="tooltip-d8acae7a" placement="bottom">Representational State Transfer</wa-tooltip>',
    );
  });

  it('distance parameter', () => {
    expect(transform('(((term >>> tip)))'.replace('term', 'distance:10 term'))).toContain(
      'distance="10"',
    );
  });

  it('inline aligned placement + negative skidding (exact, matches Ruby)', () => {
    const result = transform('(((right-end skidding:-4 API >>> Application Programming Interface)))');
    expect(result).toBe(
      '<span id="tooltip-62ab914f" tabindex="0" class="ma-tooltip-anchor" ' +
        'style="text-decoration: underline dotted; cursor: help;">API</span>' +
        '<wa-tooltip for="tooltip-62ab914f" placement="right-end" skidding="-4">Application Programming Interface</wa-tooltip>',
    );
  });

  it('block aligned placement + distance + skidding (exact, matches Ruby)', () => {
    const result = transform(
      ':::wa-tooltip bottom-end distance:8 skidding:12\nREST\n>>>\nRepresentational State Transfer\n:::',
    );
    expect(result).toBe(
      '<span id="tooltip-d8acae7a" tabindex="0" class="ma-tooltip-anchor" ' +
        'style="text-decoration: underline dotted; cursor: help;">REST</span>' +
        '<wa-tooltip for="tooltip-d8acae7a" placement="bottom-end" distance="8" skidding="12">Representational State Transfer</wa-tooltip>',
    );
  });

  it('converts literal backslash-n in tip to <br>', () => {
    expect(transform('(((term >>> Line one\\nLine two)))')).toContain('Line one<br>Line two');
  });

  it('does not convert backslash-n in anchor text', () => {
    expect(transform('(((Term\\nanchor >>> tip)))')).toContain('>Term\\nanchor</span>');
  });

  it('escapes HTML in anchor text', () => {
    const result = transform('(((<b>x</b> >>> tip)))');
    expect(result).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
