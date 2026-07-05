import { describe, it, expect } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/accordion.js';

describe('AccordionTransformer.transform', () => {
  it('icon + flags + container attrs (exact)', () => {
    expect(
      transform('//////filled single\n/// expanded icon:star Featured\nBody text\n///\n//////'),
    ).toBe(
      '<wa-accordion appearance="filled" mode="single">' +
        '<wa-accordion-item label="Featured" expanded>' +
        '<wa-icon slot="icon" name="star"></wa-icon><p>Body text</p>\n' +
        '</wa-accordion-item></wa-accordion>',
    );
  });

  it('basic accordion', () => {
    const result = transform(
      '//////\n/// What is Web Awesome?\nA library of web components.\n///\n//////',
    );
    expect(result).toContain('<wa-accordion appearance="outlined">');
    expect(result).toContain('<wa-accordion-item label="What is Web Awesome?">');
    expect(result).toContain('<p>A library of web components.</p>');
  });

  it('multiple items', () => {
    const result = transform('//////\n/// One\nFirst body\n///\n/// Two\nSecond body\n///\n//////');
    expect(result).toContain('<wa-accordion-item label="One">');
    expect(result).toContain('<wa-accordion-item label="Two">');
  });

  it('always emits default outlined appearance', () => {
    expect(transform('//////\n/// Q\nA\n///\n//////')).toContain(
      '<wa-accordion appearance="outlined">',
    );
  });

  it('omits mode when not specified', () => {
    expect(transform('//////\n/// Q\nA\n///\n//////')).not.toContain('mode=');
  });

  it('start placement', () => {
    expect(transform('//////start\n/// Q\nA\n///\n//////')).toContain('icon-placement="start"');
  });

  it('heading level', () => {
    expect(transform('//////heading:3\n/// Q\nA\n///\n//////')).toContain('heading-level="3"');
  });
});

describe('AccordionTransformer.renderAsMarkdown', () => {
  it('flattens items into sequential h3 sections', () => {
    const md = '//////\n/// What is it?\nA library.\n///\n/// Is it free?\nYes.\n///\n//////';
    expect(renderAsMarkdown(md)).toBe('### What is it?\n\nA library.\n\n### Is it free?\n\nYes.');
  });

  it('strips leading flags and icon tokens from the heading', () => {
    const md = '//////\n/// expanded icon:star Favorites\nBody.\n///\n//////';
    expect(renderAsMarkdown(md)).toBe('### Favorites\n\nBody.');
  });

  it('handles the alternative :::wa-accordion syntax', () => {
    const md = ':::wa-accordion\n/// One\nFirst\n///\n/// Two\nSecond\n///\n:::';
    const result = renderAsMarkdown(md);
    expect(result).toContain('### One');
    expect(result).toContain('### Two');
    expect(result).toContain('First');
    expect(result).toContain('Second');
  });
});
