import { describe, it, expect, beforeEach } from 'vitest';
import { transform, renderAsMarkdown } from '../src/transformers/callout.js';
import { resetConfiguration } from '../src/config.js';

describe('CalloutTransformer.transform', () => {
  beforeEach(() => resetConfiguration());

  it('transforms info (alias for brand)', () => {
    const result = transform(':::info\nThis is info\n:::');
    expect(result).toContain('<wa-callout variant="brand">');
    expect(result).toContain('<wa-icon slot="icon" name="circle-info" variant="solid"></wa-icon>');
    expect(result).toContain('<p>This is info</p>');
    expect(result).toContain('</wa-callout>');
  });

  it('transforms brand', () => {
    expect(transform(':::brand\nThis is brand\n:::')).toContain(
      '<wa-icon slot="icon" name="circle-info" variant="solid"></wa-icon>',
    );
  });

  it('transforms success', () => {
    expect(transform(':::success\nx\n:::')).toContain(
      '<wa-icon slot="icon" name="circle-check" variant="solid"></wa-icon>',
    );
  });

  it('transforms warning', () => {
    expect(transform(':::warning\nx\n:::')).toContain(
      '<wa-icon slot="icon" name="triangle-exclamation" variant="solid"></wa-icon>',
    );
  });

  it('transforms danger', () => {
    expect(transform(':::danger\nx\n:::')).toContain(
      '<wa-icon slot="icon" name="circle-exclamation" variant="solid"></wa-icon>',
    );
  });

  it('transforms neutral', () => {
    expect(transform(':::neutral\nx\n:::')).toContain(
      '<wa-icon slot="icon" name="gear" variant="solid"></wa-icon>',
    );
  });

  it('supports size', () => {
    expect(transform(':::info small\nx\n:::')).toContain('<wa-callout variant="brand" size="small">');
  });

  it('supports appearance', () => {
    expect(transform(':::info accent\nx\n:::')).toContain(
      '<wa-callout variant="brand" appearance="accent">',
    );
  });

  it('supports size and appearance together', () => {
    expect(transform(':::warning large filled-outlined\nC\n:::')).toContain(
      '<wa-callout variant="warning" appearance="filled-outlined" size="large">',
    );
  });

  it('overrides default icon with icon:name', () => {
    const result = transform(':::warning icon:shield\nSecurity notice\n:::');
    expect(result).toContain('<wa-icon slot="icon" name="shield" variant="solid"></wa-icon>');
    expect(result).not.toContain('triangle-exclamation');
  });

  it('works with explicit icon slot', () => {
    expect(transform(':::success icon:icon:star\nStarred\n:::')).toContain(
      '<wa-icon slot="icon" name="star" variant="solid"></wa-icon>',
    );
  });

  it('alternative syntax with icon', () => {
    const result = transform(':::wa-callout warning icon:shield\nSecurity notice\n:::');
    expect(result).toContain('<wa-icon slot="icon" name="shield" variant="solid"></wa-icon>');
    expect(result).toContain('<wa-callout variant="warning">');
  });

  it('applies animation to default variant icon', () => {
    expect(transform(':::warning shake\nHeads up\n:::')).toContain(
      '<wa-icon slot="icon" name="triangle-exclamation" variant="solid" animation="shake"></wa-icon>',
    );
  });

  it('overrides variant on a custom icon', () => {
    expect(transform(':::brand icon:rocket light\nBlast off\n:::')).toContain(
      '<wa-icon slot="icon" name="rocket" variant="light"></wa-icon>',
    );
  });

  it('overrides family, variant, and animation', () => {
    expect(transform(':::danger sharp regular bounce\nWatch out\n:::')).toContain(
      '<wa-icon slot="icon" name="circle-exclamation" family="sharp" variant="regular" animation="bounce"></wa-icon>',
    );
  });

  it('does not transform invalid callout types', () => {
    expect(transform(':::invalid\nThis is invalid\n:::')).toBe(':::invalid\nThis is invalid\n:::');
  });

  it('handles two separate paragraphs', () => {
    const result = transform(':::warning\nFirst paragraph\n\nSecond one.\n:::');
    expect(result).toContain('<p>First paragraph</p>');
    expect(result).toContain('<p>Second one.</p>');
  });
});

describe('CalloutTransformer.renderAsMarkdown', () => {
  it('renders info as a GFM NOTE alert', () => {
    expect(renderAsMarkdown(':::info\nThis is info\n:::')).toBe('> [!NOTE]\n> This is info');
  });

  it('renders brand as a GFM NOTE alert', () => {
    expect(renderAsMarkdown(':::brand\nBrand notice\n:::')).toBe('> [!NOTE]\n> Brand notice');
  });

  it('renders success as a GFM TIP alert', () => {
    expect(renderAsMarkdown(':::success\nAll good\n:::')).toBe('> [!TIP]\n> All good');
  });

  it('renders warning as a GFM WARNING alert', () => {
    expect(renderAsMarkdown(':::warning\nBe careful\n:::')).toBe('> [!WARNING]\n> Be careful');
  });

  it('renders danger as a GFM CAUTION alert', () => {
    expect(renderAsMarkdown(':::danger\nBad stuff\n:::')).toBe('> [!CAUTION]\n> Bad stuff');
  });

  it('renders neutral as a GFM IMPORTANT alert', () => {
    expect(renderAsMarkdown(':::neutral\nConfig required\n:::')).toBe(
      '> [!IMPORTANT]\n> Config required',
    );
  });

  it('quotes multi-line content', () => {
    expect(renderAsMarkdown(':::info\nLine 1\nLine 2\n:::')).toBe('> [!NOTE]\n> Line 1\n> Line 2');
  });

  it('preserves blank lines between paragraphs as bare quote markers', () => {
    expect(renderAsMarkdown(':::info\nPara one\n\nPara two\n:::')).toBe(
      '> [!NOTE]\n> Para one\n>\n> Para two',
    );
  });

  it('ignores unknown variants', () => {
    const md = ':::invalid\nnope\n:::';
    expect(renderAsMarkdown(md)).toBe(md);
  });

  it('handles alternative :::wa-callout syntax', () => {
    expect(renderAsMarkdown(':::wa-callout warning\nBeware\n:::')).toBe('> [!WARNING]\n> Beware');
  });
});
