import { describe, it, expect } from 'vitest';
import { process } from '../src/index.js';

describe('process (full pipeline)', () => {
  it('transforms a callout end-to-end', () => {
    const result = process(':::info\nHello **world**\n:::');
    expect(result).toContain('<wa-callout variant="brand">');
    expect(result).toContain('<wa-icon slot="icon" name="circle-info" variant="solid"></wa-icon>');
    expect(result).toContain('<strong>world</strong>');
  });

  it('protects fenced code blocks from transformation', () => {
    const input = 'Before\n\n```\n:::info\nNot a callout\n:::\n```\n\nAfter';
    const result = process(input);
    expect(result).toContain('```\n:::info\nNot a callout\n:::\n```');
    expect(result).not.toContain('<wa-callout');
  });

  it('protects code blocks but transforms surrounding components', () => {
    const input = '!!!brand\nBadge\n!!!\n\n```\n!!!brand\nNot a badge\n!!!\n```';
    const result = process(input);
    expect(result).toContain('<wa-badge variant="brand">Badge</wa-badge>');
    expect(result).toContain('```\n!!!brand\nNot a badge\n!!!\n```');
  });

  it('handles multiple component types in one document', () => {
    const input = ':::success\nDone\n:::\n\n%%%brand\nClick\n%%%\n\n@@@neutral\nTag\n@@@';
    const result = process(input);
    expect(result).toContain('<wa-callout variant="success">');
    expect(result).toContain('<wa-button variant="brand">Click</wa-button>');
    expect(result).toContain('<wa-tag variant="neutral">Tag</wa-tag>');
  });

  it('leaves plain markdown untouched', () => {
    const input = '# Title\n\nJust a paragraph.';
    expect(process(input)).toBe(input);
  });
});
